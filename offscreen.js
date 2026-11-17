let stream = null;
let audioContext = null;
let animationTimer = null;
let analyser = null;
let frequencyData = null;
let targetTabId = null;
let previousBass = 0;
let lastBeat = 0;

async function stopCapture(notify = true) {
  if (animationTimer) clearInterval(animationTimer);
  animationTimer = null;
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  if (audioContext) {
    try { await audioContext.close(); } catch (_) {}
  }
  audioContext = null;
  analyser = null;
  frequencyData = null;
  targetTabId = null;
  previousBass = 0;
  lastBeat = 0;
  if (notify) chrome.runtime.sendMessage({ type: "AUDIO_CAPTURE_ENDED" }).catch(() => {});
}

async function startCapture(streamId, tabId) {
  await stopCapture(false);
  targetTabId = tabId;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.68;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    // Route captured audio back to the tab so playback remains audible.
    analyser.connect(audioContext.destination);

    animationTimer = setInterval(() => {
      if (!analyser || !frequencyData) return;
      analyser.getByteFrequencyData(frequencyData);
      const average = (from, to) => {
        let total = 0, count = 0;
        for (let i = from; i < Math.min(to, frequencyData.length); i++) {
          total += frequencyData[i]; count++;
        }
        return count ? total / count / 255 : 0;
      };
      const bass = average(1, 7);
      const mid = average(7, 34);
      const treble = average(34, 110);
      const volume = Math.min(1, bass * 0.42 + mid * 0.36 + treble * 0.22);
      // Compact logarithmic-ish spectrum for the ASCII waveform renderer.
      const spectrum = [];
      const maxBin = frequencyData.length - 1;
      for (let band = 0; band < 48; band++) {
        const from = Math.max(1, Math.floor(Math.pow(band / 48, 1.7) * maxBin));
        const to = Math.max(from + 1, Math.floor(Math.pow((band + 1) / 48, 1.7) * maxBin));
        spectrum.push(average(from, to));
      }
      const now = performance.now();
      const beat = bass > 0.19 && bass > previousBass * 1.16 && now - lastBeat > 190;
      if (beat) lastBeat = now;
      previousBass = previousBass * 0.72 + bass * 0.28;
      chrome.runtime.sendMessage({
        type: "AUDIO_LEVELS", tabId: targetTabId,
        volume, bass, mid, treble, spectrum, beat, timestamp: Date.now()
      }).catch(() => {});
    }, 35);
  } catch (error) {
    await stopCapture();
    chrome.runtime.sendMessage({
      type: "AUDIO_CAPTURE_ERROR",
      error: error?.message || "Audio capture failed."
    }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.target !== "offscreen") return;
  if (message.type === "START_CAPTURE") startCapture(message.streamId, message.tabId);
  if (message.type === "STOP_CAPTURE") stopCapture();
});
