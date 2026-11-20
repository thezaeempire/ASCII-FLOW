let capturedTabId = null;
let stopping = false;

async function ensureOffscreen() {
  const url = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [url]
  });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
      justification: "Capture the active tab's audio for the user's opt-in audio visualizer."
    });
  }
}

async function stopCapture() {
  stopping = true;
  try { await chrome.runtime.sendMessage({ target: "offscreen", type: "STOP_CAPTURE" }); } catch (_) {}
  if (capturedTabId !== null) chrome.tabs.sendMessage(capturedTabId, { type: "AUDIO_CAPTURE_ENDED" }).catch(() => {});
  capturedTabId = null;
  chrome.storage.local.set({ asciiFlowAudioActive: false });
  stopping = false;
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "START_AUDIO_CAPTURE") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error("No active tab found.");
        // Existing tabs may predate extension reload/install; inject the content
        // script now so audio visuals start without requiring a page refresh.
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        } catch (injectError) {
          // Already-injected pages are guarded by the content script's singleton.
          if (!String(injectError?.message || "").includes("Cannot access")) throw injectError;
        }
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
        await ensureOffscreen();
        capturedTabId = tab.id;
        await chrome.runtime.sendMessage({
          target: "offscreen", type: "START_CAPTURE", streamId, tabId: tab.id
        });
        chrome.tabs.sendMessage(tab.id, { type: "AUDIO_CAPTURE_STARTED" }).catch(() => {});
        chrome.storage.local.set({ asciiFlowAudioActive: true });
        sendResponse({ ok: true });
      } catch (error) {
        if (capturedTabId !== null) {
          chrome.tabs.sendMessage(capturedTabId, { type: "AUDIO_CAPTURE_ENDED" }).catch(() => {});
          capturedTabId = null;
        }
        chrome.storage.local.set({ asciiFlowAudioActive: false });
        sendResponse({ ok: false, error: error?.message || "Could not start audio capture." });
      }
    })();
    return true;
  }
  if (message?.type === "STOP_AUDIO_CAPTURE") {
    stopCapture().then(sendResponse);
    return true;
  }
  if (message?.type === "AUDIO_LEVELS" && sender.url?.includes("offscreen.html")) {
    if (capturedTabId !== null) {
      chrome.tabs.sendMessage(capturedTabId, message).catch(() => {});
    }
  }
  if (message?.type === "AUDIO_CAPTURE_ENDED" && sender.url?.includes("offscreen.html")) {
    if (capturedTabId !== null) chrome.tabs.sendMessage(capturedTabId, { type: "AUDIO_CAPTURE_ENDED" }).catch(() => {});
    capturedTabId = null;
    chrome.storage.local.set({ asciiFlowAudioActive: false });
  }
  if (message?.type === "AUDIO_CAPTURE_ERROR" && sender.url?.includes("offscreen.html")) {
    if (capturedTabId !== null) chrome.tabs.sendMessage(capturedTabId, { type: "AUDIO_CAPTURE_ENDED" }).catch(() => {});
    capturedTabId = null;
    chrome.storage.local.set({ asciiFlowAudioActive: false });
  }
  return false;
});


chrome.commands.onCommand.addListener(async command => {
  if (command !== "toggle-ascii-flow") return;
  const data = await chrome.storage.local.get({ asciiFlowEnabled: true });
  await chrome.storage.local.set({ asciiFlowEnabled: !data.asciiFlowEnabled });
});
