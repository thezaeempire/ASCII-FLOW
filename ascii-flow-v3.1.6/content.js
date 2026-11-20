(() => {
  if (window.__asciiFlowLoadedV17) return;
  window.__asciiFlowLoadedV17 = true;

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100vw", height: "100vh",
    zIndex: "2147483646", pointerEvents: "none", opacity: "1",
    transition: "opacity 280ms ease", mixBlendMode: "normal"
  });
  (document.documentElement || document.body).appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  const cellW = 18, cellH = 21;
  const themes = {
    aurora: { core: [45, 245, 255], mid: [255, 78, 205], edge: [165, 90, 255], idle: [105, 86, 128] },
    cyber:  { core: [125, 255, 130], mid: [50, 225, 255], edge: [125, 110, 255], idle: [80, 112, 103] },
    sunset: { core: [255, 195, 65], mid: [255, 85, 145], edge: [185, 100, 255], idle: [125, 88, 103] },
    ice:    { core: [225, 255, 255], mid: [90, 210, 255], edge: [125, 140, 255], idle: [82, 110, 145] },
    synth:  { core: [255, 70, 245], mid: [130, 75, 255], edge: [55, 40, 150], idle: [100, 75, 135] },
    toxic:  { core: [210, 255, 40], mid: [90, 255, 115], edge: [0, 155, 120], idle: [80, 120, 85] },
    ocean:  { core: [50, 245, 220], mid: [30, 150, 255], edge: [55, 75, 210], idle: [70, 105, 130] },
    ember:  { core: [255, 245, 130], mid: [255, 125, 40], edge: [235, 45, 90], idle: [125, 85, 75] }
  };
  // Resting field is deliberately quiet dots. Active characters evolve with local energy.
  const glyphByEnergy = [
    { min: 0.00, glyph: "." },
    { min: 0.10, glyph: ":" },
    { min: 0.23, glyph: "+" },
    { min: 0.39, glyph: "*" },
    { min: 0.57, glyph: "#" },
    { min: 0.78, glyph: "@" }
  ];

  let width = 0, height = 0, dpr = 1, cols = 0, rows = 0;
  let enabled = true, themeName = "aurora", raf = 0, lastFrame = 0;
  let settings = { trailSize: 100, trailDuration: 1050, glow: 70, customColors: false,
    coreColor: "#2df5ff", midColor: "#ff4ecd", edgeColor: "#a55aff" };
  let grid = [], trail = [], lastPointer = null, bursts = [];
  let scrollParticles = [];
  let coreField = new Float32Array(0), midField = new Float32Array(0), edgeField = new Float32Array(0);
  let dirty = true;
  let audioActive = false;
  let audioData = { volume: 0, bass: 0, mid: 0, treble: 0, spectrum: [] };
  let spectrumSmooth = new Float32Array(48);
  const audioSettings = { sensitivity: 100, beatImpact: 30 };
  let smoothedBass = 0, lastBassFrame = 0;
  let audioWaves = [];
  let beatPulses = [];

  const hash = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const mix = (a, b, t) => {
    t = Math.max(0, Math.min(1, t));
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  };

  function hexRgb(hex) {
    const value = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return null;
    return [parseInt(value.slice(0,2),16), parseInt(value.slice(2,4),16), parseInt(value.slice(4,6),16)];
  }
  function activeTheme() {
    const base = themes[themeName] || themes.aurora;
    if (!settings.customColors) return base;
    return { ...base, core: hexRgb(settings.coreColor) || base.core,
      mid: hexRgb(settings.midColor) || base.mid, edge: hexRgb(settings.edgeColor) || base.edge };
  }

  let pageIsLight = false;
  let lastToneCheck = 0;
  function detectPageTone(now = performance.now()) {
    if (now - lastToneCheck < 900) return;
    lastToneCheck = now;
    let node = document.elementFromPoint(Math.min(innerWidth - 1, innerWidth / 2), Math.min(innerHeight - 1, innerHeight / 2));
    let background = null;
    while (node && node !== document.documentElement) {
      const value = getComputedStyle(node).backgroundColor;
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (match) {
        const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (parts.length >= 3 && (parts.length < 4 || parts[3] > 0.08)) {
          background = parts.slice(0, 3);
          break;
        }
      }
      node = node.parentElement;
    }
    if (!background) {
      const value = getComputedStyle(document.documentElement).backgroundColor;
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (match) background = match[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3).map(Number);
    }
    if (background && background.length === 3) {
      const luminance = (0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2]);
      pageIsLight = luminance >= 145;
    } else {
      pageIsLight = window.matchMedia?.('(prefers-color-scheme: light)').matches || false;
    }
  }
  function displayTheme(now) {
    const base = activeTheme();
    detectPageTone(now);
    if (!pageIsLight) return base;
    const invert = color => color.map(channel => 255 - channel);
    return { core: invert(base.core), mid: invert(base.mid), edge: invert(base.edge), idle: invert(base.idle) };
  }

  function buildGrid() {
    cols = Math.ceil(width / cellW) + 1;
    rows = Math.ceil(height / cellH) + 1;
    grid = new Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      grid[y * cols + x] = {
        x: x * cellW + cellW / 2,
        y: y * cellH + cellH / 2,
        variation: hash(x, y)
      };
    }
    coreField = new Float32Array(cols * rows);
    midField = new Float32Array(cols * rows);
    edgeField = new Float32Array(cols * rows);
    dirty = true;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = innerWidth; height = innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
    schedule();
  }

  function drawIdle() {
    const theme = displayTheme(performance.now());
    ctx.clearRect(0, 0, width, height);
    ctx.font = "900 21px 'Arial Rounded MT Bold', 'Trebuchet MS', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const c of grid) {
      ctx.globalAlpha = 0.20 + c.variation * 0.08;
      ctx.fillStyle = `rgb(${theme.idle.join(",")})`;
      ctx.fillText(".", c.x, c.y);
    }
    ctx.globalAlpha = 1;
    dirty = false;
  }

  function schedule() {
    if (enabled && !raf) raf = requestAnimationFrame(draw);
  }
  function setEnabled(value) {
    enabled = !!value;
    canvas.style.opacity = enabled ? "1" : "0";
    if (enabled) { dirty = true; schedule(); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function applySettings(data) {
    if (typeof data.asciiFlowEnabled === "boolean") setEnabled(data.asciiFlowEnabled);
    if (data.asciiFlowTheme && themes[data.asciiFlowTheme]) themeName = data.asciiFlowTheme;
    settings = { ...settings, ...(data.asciiFlowSettings || {}) };
    
    dirty = true; schedule();
  }
  chrome.storage.local.get({ asciiFlowEnabled: true, asciiFlowTheme: "aurora", asciiFlowSettings: {} }, applySettings);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const update = {};
    if (changes.asciiFlowEnabled) update.asciiFlowEnabled = changes.asciiFlowEnabled.newValue;
    if (changes.asciiFlowTheme) update.asciiFlowTheme = changes.asciiFlowTheme.newValue;
    if (changes.asciiFlowSettings) update.asciiFlowSettings = changes.asciiFlowSettings.newValue;
    applySettings(update);
  });

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "AUDIO_CAPTURE_STARTED") {
      audioActive = true;
      trail.length = 0;
      bursts.length = 0;
      lastPointer = null;
      dirty = true;
      schedule();
    } else if (message?.type === "AUDIO_LEVELS") {
      if (!audioActive) {
        audioActive = true;
        trail.length = 0;
        bursts.length = 0;
        lastPointer = null;
      }
      audioData = {
        volume: Math.min(1, message.volume || 0),
        bass: Math.min(1, message.bass || 0),
        mid: Math.min(1, message.mid || 0),
        treble: Math.min(1, message.treble || 0),
        spectrum: Array.isArray(message.spectrum) ? message.spectrum.slice(0, 48) : []
      };
      for (let i = 0; i < 48; i++) {
        const target = Math.max(0, Math.min(1, Number(audioData.spectrum[i]) || 0));
        const tau = target > spectrumSmooth[i] ? 0.20 : 0.34;
        spectrumSmooth[i] += (target - spectrumSmooth[i]) * tau;
      }
      if (message.beat) {
        const beatTime = performance.now();
        // Each beat picks one new sector; its centre gets the strongest lift.
        const sector = hash(Math.floor(beatTime / 180), Math.floor(audioData.bass * 100));
        beatPulses.push({ time: beatTime, angle: sector * Math.PI * 2,
          xRatio: 0.08 + sector * 0.84,
          strength: Math.min(1, 0.72 + audioData.bass * 0.28) });
        if (beatPulses.length > 4) beatPulses.shift();
        audioWaves.push({ time: beatTime, strength: Math.min(1, 0.45 + audioData.bass) });
        if (audioWaves.length > 5) audioWaves.shift();
      }
      schedule();
    } else if (message?.type === "AUDIO_CAPTURE_ENDED") {
      audioActive = false;
      audioData = { volume: 0, bass: 0, mid: 0, treble: 0, spectrum: [] };
      spectrumSmooth.fill(0);
      audioWaves.length = 0;
      beatPulses.length = 0;
      dirty = true; schedule();
    }
  });

  function beatSectorAt(c, now) {
    if (!beatPulses.length) return 0;
    const dx = c.x - width / 2;
    const dy = c.y - height / 2;
    const angle = Math.atan2(dy, dx);
    const radius = Math.hypot(dx, dy);
    const normalizedRadius = radius / Math.max(1, Math.min(width, height) * 0.5);
    if (normalizedRadius < 0.42) return 0;

    // Seven waveform bars: the middle bar jumps highest, with stepped
    // neighboring bars falling away like the supplied audio-wave reference.
    const barProfile = [0.30, 0.52, 0.76, 1.00, 0.76, 0.52, 0.30];
    const barSpacing = 0.105;
    let value = 0;

    for (const pulse of beatPulses) {
      const age = (now - pulse.time) / 1000;
      if (age < 0 || age > 0.82) continue;

      const delta = Math.atan2(
        Math.sin(angle - pulse.angle),
        Math.cos(angle - pulse.angle)
      );
      const bar = Math.round(delta / barSpacing) + 3;
      if (bar < 0 || bar >= barProfile.length) continue;

      const barCenter = (bar - 3) * barSpacing;
      const withinBar = Math.max(0, 1 - Math.abs(delta - barCenter) / (barSpacing * 0.48));
      const envelope = Math.exp(-age / 0.46) * Math.pow(Math.max(0, 1 - age / 0.82), 0.65);
      const edgeWeight = Math.min(1, Math.max(0, (normalizedRadius - 0.38) / 0.62));
      const lift = barProfile[bar] * withinBar * envelope * edgeWeight * pulse.strength;

      value = Math.max(value, lift);
    }
    return value;
  }

  function audioWaveAt(c, now) {
    let amount = 0;
    const speed = 620;
    for (const wave of audioWaves) {
      const age = (now - wave.time) / 1000;
      if (age < 0 || age > 1.7) continue;
      const radius = age * speed;
      const distance = Math.hypot(c.x - width / 2, c.y - height / 2);
      const ring = Math.max(0, 1 - Math.abs(distance - radius) / 68);
      amount = Math.max(amount, ring * wave.strength * Math.pow(1 - age / 1.7, 0.8));
    }
    return amount;
  }

  function addTrail(x, y, now) {
    if (!enabled || audioActive) return;
    if (lastPointer) {
      const dx = x - lastPointer.x, dy = y - lastPointer.y;
      const steps = Math.min(12, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        trail.push({ x: lastPointer.x + dx * t, y: lastPointer.y + dy * t, time: now });
      }
    } else trail.push({ x, y, time: now });
    lastPointer = { x, y };
    if (trail.length > 100) trail.splice(0, trail.length - 100);
    schedule();
  }
  addEventListener("pointermove", e => addTrail(e.clientX, e.clientY, performance.now()), { passive: true });
  addEventListener("pointerdown", e => {
    if (!enabled || audioActive || e.button !== 0) return;
    bursts.push({ x: e.clientX, y: e.clientY, time: performance.now() });
    if (bursts.length > 3) bursts.shift();
    schedule();
  }, { passive: true });
  addEventListener("wheel", e => {
    if (!enabled || audioActive) return;
    const now = performance.now();
    const direction = Math.sign(e.deltaY);
    if (!direction) return;
    // Scroll down: a few particles rise from the bottom.
    // Scroll up: a few particles fall from the top.
    const count = Math.min(7, Math.max(3, Math.round(Math.abs(e.deltaY) / 42)));
    const bandHeight = Math.min(105, height * 0.16);
    for (let i = 0; i < count; i++) {
      const fromTop = direction < 0;
      scrollParticles.push({
        x: 22 + Math.random() * Math.max(1, width - 44),
        y: fromTop ? Math.random() * bandHeight : height - Math.random() * bandHeight,
        vx: (Math.random() - 0.5) * 0.28,
        vy: fromTop ? 34 + Math.random() * 48 : -(34 + Math.random() * 48),
        born: now,
        life: 760 + Math.random() * 420,
        glyph: [".", ":", "+", "*"][Math.floor(Math.random() * 4)],
        size: 12 + Math.random() * 7
      });
    }
    if (scrollParticles.length > 30) scrollParticles.splice(0, scrollParticles.length - 30);
    schedule();
  }, { passive: true });
  addEventListener("keydown", e => {
    const tag = e.target?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "1" && !typing) {
      e.preventDefault(); e.stopPropagation();
      const next = !enabled;
      chrome.storage.local.set({ asciiFlowEnabled: next });
      setEnabled(next);
      return;
    }
  });

  function calculateInfluence(now) {
    const core = coreField, mid = midField, edge = edgeField;
    core.fill(0); mid.fill(0); edge.fill(0);
    const size = Math.max(60, Math.min(150, Number(settings.trailSize) || 100)) / 100;
    const coreR = 72 * size, midR = 150 * size, edgeR = 215 * size;
    const rx = Math.ceil(edgeR / cellW), ry = Math.ceil(edgeR / cellH);
    for (let pIndex = 0; pIndex < trail.length; pIndex++) {
      const p = trail[pIndex];
      const age = now - p.time;
      const life = Math.max(350, Math.min(2200, Number(settings.trailDuration) || 1050));
      if (age < 0 || age > life) continue;
      const fade = Math.pow(1 - age / life, 1.25);
      const gx = p.x / cellW, gy = p.y / cellH;
      const y0 = Math.max(0, Math.floor(gy - ry)), y1 = Math.min(rows - 1, Math.ceil(gy + ry));
      const x0 = Math.max(0, Math.floor(gx - rx)), x1 = Math.min(cols - 1, Math.ceil(gx + rx));
      for (let y = y0; y <= y1; y++) {
        const cy = y * cellH + cellH / 2, dy = cy - p.y, dy2 = dy * dy;
        for (let x = x0; x <= x1; x++) {
          const dx = x * cellW + cellW / 2 - p.x, dist2 = dx * dx + dy2;
          const idx = y * cols + x;
          if (dist2 < coreR * coreR) {
            const v = Math.pow(1 - Math.sqrt(dist2) / coreR, 1.05) * fade;
            if (v > core[idx]) core[idx] = v;
          }
          if (dist2 < midR * midR) {
            const v = Math.pow(1 - Math.sqrt(dist2) / midR, 1.25) * fade;
            if (v > mid[idx]) mid[idx] = v;
          }
          if (dist2 < edgeR * edgeR) {
            const v = Math.pow(1 - Math.sqrt(dist2) / edgeR, 1.45) * fade;
            if (v > edge[idx]) edge[idx] = v;
          }
        }
      }
    }
    return { core, mid, edge };
  }

  function rippleAt(c, now) {
    let amount = 0;
    const duration = 1800;
    const maxRadius = Math.hypot(width, height) + 80;
    for (const b of bursts) {
      const t = (now - b.time) / duration;
      if (t < 0 || t > 1) continue;
      const distance = Math.hypot(c.x - b.x, c.y - b.y);
      const radius = 18 + t * maxRadius;
      const ring = Math.max(0, 1 - Math.abs(distance - radius) / 100);
      amount = Math.max(amount, ring * Math.pow(1 - t, 0.62));
    }
    return amount;
  }

  function glyphFor(intensity, variation) {
    let glyph = ".";
    for (const entry of glyphByEnergy) if (intensity >= entry.min) glyph = entry.glyph;
    // A little deterministic variety in the strongest, dense parts.
    if (intensity > 0.58 && variation > 0.76) return "%";
    if (intensity > 0.72 && variation < 0.18) return "&";
    return glyph;
  }

  function drawAudioWaveform(now, theme) {
    // Quiet dotted matrix behind a single horizontal ASCII spectrum.
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px ui-monospace, Consolas, monospace";
    for (let y = 14; y < height; y += 18) {
      for (let x = 12; x < width; x += 18) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = `rgb(${theme.idle.join(",")})`;
        ctx.fillText(".", x, y);
      }
    }

    // Keep the audio visual focused and compact, rather than stretching edge-to-edge.
    const waveWidth = width * 0.78;
    const waveLeft = (width - waveWidth) / 2;
    const count = Math.max(18, Math.floor(waveWidth / 17));
    const baseline = height - Math.max(24, Math.min(38, height * 0.09));
    const spacing = waveWidth / count;
    const glyphs = [".", ":", "+", "*", "#", "%", "@"];
    const peaks = beatPulses;
    // Larger, readable glyphs closer to the normal mouse-trail character scale.
    const cell = Math.max(17, Math.min(21, spacing * 1.08));

    for (let i = 0; i < count; i++) {
      const x = waveLeft + spacing * i + spacing / 2;
      const bandIndex = Math.min(47, Math.floor(i / count * 48));
      const spectrumLevel = spectrumSmooth[bandIndex] || 0;
      let heightLevel = Math.pow(spectrumLevel, 0.82) * height * 0.40;

      // A detected beat creates a waveform-shaped burst at one position.
      // The centre column rises highest; neighboring columns taper symmetrically.
      for (const beat of peaks) {
        const age = (now - beat.time) / 1000;
        if (age < 0 || age > 0.72) continue;
        const centerX = waveLeft + beat.xRatio * waveWidth;
        const distance = Math.abs(x - centerX) / Math.max(1, spacing);
        const profile = Math.max(0, 1 - distance / 7);
        const stepped = [1, 0.82, 0.64, 0.46, 0.30, 0.18, 0.09][Math.min(6, Math.floor(distance))] || 0;
        const envelope = Math.exp(-age / 0.34) * Math.pow(Math.max(0, 1 - age / 0.72), 0.55);
        heightLevel = Math.max(heightLevel, height * 0.44 * stepped * envelope);
      }

      // Smooth baseline movement and keep quiet columns visible.
      heightLevel = Math.max(2, Math.min(height * 0.48, heightLevel));
      const rowsUp = Math.max(1, Math.floor(heightLevel / (cell * 1.12)));
      const hue = i / Math.max(1, count - 1);
      const color = hue < 0.5
        ? mix(theme.core, theme.mid, hue * 2)
        : mix(theme.mid, theme.edge, (hue - 0.5) * 2);
      const strength = Math.min(1, 0.48 + spectrumLevel * 0.7);
      ctx.fillStyle = `rgb(${color.join(",")})`;
      ctx.shadowColor = `rgb(${color.join(",")})`;
      ctx.shadowBlur = 5 + spectrumLevel * 7;

      // Baseline is a continuous stream of ASCII characters.
      ctx.globalAlpha = 0.78;
      ctx.font = `bold ${cell}px ui-monospace, Consolas, monospace`;
      ctx.fillText(glyphs[Math.min(4, Math.floor(spectrumLevel * 5))], x, baseline);

      // Vertical stacks create the waveform bars, tallest at beat centres.
      for (let row = 1; row <= rowsUp; row++) {
        const level = row / rowsUp;
        const glyphIndex = Math.min(glyphs.length - 1, Math.floor((1 - level) * 3 + spectrumLevel * 3));
        ctx.globalAlpha = Math.min(1, strength * (0.58 + level * 0.42));
        ctx.fillText(glyphs[glyphIndex], x, baseline - row * cell);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }


  function drawAudioPointerLayer(field, theme) {
    // Compact pointer accent designed to sit over the v2.9.4 waveform.
    // It deliberately avoids the legacy full-screen mouse renderer.
    const core = field.core, mid = field.mid, edge = field.edge;
    const glyphs = [".", ":", "+", "*", "#", "%"];
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "15px ui-monospace, Consolas, monospace";
    for (let i = 0; i < grid.length; i++) {
      const c = grid[i];
      const strength = Math.max(core[i], mid[i] * 0.72, edge[i] * 0.38);
      if (strength < 0.10) continue;
      const level = Math.min(1, strength);
      const color = mix(theme.mid, theme.core, Math.min(1, core[i] * 1.15 + mid[i] * 0.25));
      ctx.globalAlpha = Math.min(0.88, 0.12 + level * 0.72);
      ctx.fillStyle = `rgb(${color.join(",")})`;
      ctx.fillText(glyphs[Math.min(glyphs.length - 1, Math.floor(level * glyphs.length))], c.x, c.y);
    }
    ctx.restore();
  }

  function drawScrollParticles(now, theme) {
    if (!scrollParticles.length) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = scrollParticles.length - 1; i >= 0; i--) {
      const particle = scrollParticles[i];
      const age = now - particle.born;
      if (age >= particle.life) {
        scrollParticles.splice(i, 1);
        continue;
      }
      const t = age / particle.life;
      const fade = Math.sin(Math.PI * t) * 0.82;
      particle.x += particle.vx * 0.016;
      particle.y += particle.vy * 0.016;
      const color = mix(theme.mid, theme.core, 0.45 + (1 - t) * 0.35);
      ctx.globalAlpha = fade;
      ctx.fillStyle = `rgb(${color.join(",")})`;
      ctx.font = `${particle.size}px ui-monospace, Consolas, monospace`;
      ctx.shadowColor = `rgb(${color.join(",")})`;
      ctx.shadowBlur = 7;
      ctx.fillText(particle.glyph, particle.x, particle.y);
    }
    ctx.restore();
  }

  function draw() {
    raf = 0;
    if (!enabled) return;
    const now = performance.now();

    // Rounded bass envelope: smooth attack with a softer, slower release.
    const bassDt = lastBassFrame ? Math.min(50, now - lastBassFrame) : 16;
    lastBassFrame = now;
    const bassTarget = audioActive ? audioData.bass : 0;
    const bassTau = bassTarget > smoothedBass ? 110 : 260;
    const bassBlend = 1 - Math.exp(-bassDt / bassTau);
    smoothedBass += (bassTarget - smoothedBass) * bassBlend;
    if (now - lastFrame < 15) { schedule(); return; }
    lastFrame = now;

    while (trail.length && now - trail[0].time > (Number(settings.trailDuration) || 1050)) trail.shift();
    for (let i = bursts.length - 1; i >= 0; i--) if (now - bursts[i].time > 1850) bursts.splice(i, 1);
    for (let i = audioWaves.length - 1; i >= 0; i--) if (now - audioWaves[i].time > 1700) audioWaves.splice(i, 1);
    for (let i = beatPulses.length - 1; i >= 0; i--) if (now - beatPulses[i].time > 850) beatPulses.splice(i, 1);

    const theme = displayTheme(now);
    if (audioActive) {
      drawAudioWaveform(now, theme);
      schedule();
      return;
    }
    if (!trail.length && !bursts.length && !scrollParticles.length) {
      if (!audioActive && dirty) drawIdle();
      if (audioActive || smoothedBass > 0.008 || beatPulses.length) schedule();
      return;
    }

    const field = calculateInfluence(now);
    ctx.clearRect(0, 0, width, height);
    ctx.font = "900 21px 'Arial Rounded MT Bold', 'Trebuchet MS', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    for (let i = 0; i < grid.length; i++) {
      const c = grid[i], a = field.core[i], b = field.mid[i], d = field.edge[i];
      const ripple = bursts.length ? rippleAt(c, now) : 0;
      const sensitivity = Math.max(20, Math.min(200, Number(audioSettings.sensitivity) || 100)) / 100;
      const impact = Math.max(20, Math.min(200, Number(audioSettings.beatImpact) || 100)) / 100;
      // Keep ordinary audio motion subtle; loud bass is focused on the left/right screen edges.
      const edgeDistance = Math.min(c.x, width - c.x);
      const edgeBand = Math.max(0, Math.min(1, (230 - edgeDistance) / 150));
      const edgeFocus = edgeBand * edgeBand * (3 - 2 * edgeBand);
      const bassGateRaw = Math.max(0, (smoothedBass - 0.10) / 0.62);
      const bassGate = bassGateRaw * bassGateRaw * (3 - 2 * bassGateRaw);
      const bassKick = audioActive ? Math.min(0.92, bassGate * sensitivity * impact * 1.45) * edgeFocus : 0;
      const pulse = audioActive ? Math.min(0.18, audioData.volume * 0.10 * sensitivity) : 0;
      const travellingWave = audioActive ? audioWaveAt(c, now) * impact * (0.18 + edgeFocus * 0.82) : 0;
      const beatSector = audioActive ? beatSectorAt(c, now) * impact * edgeFocus : 0;
      const audioIntensity = Math.min(1, Math.max(pulse, travellingWave, bassKick, beatSector));
      const rawIntensity = Math.min(1, Math.max(a, b * 0.88, d * 0.70, ripple, audioIntensity));
      const intensity = rawIntensity * rawIntensity * (3 - 2 * rawIntensity);
      if (intensity < 0.025) continue;

      let color = mix(theme.edge, theme.mid, Math.min(1, b * 0.95));
      color = mix(color, theme.core, Math.min(1, Math.max(a, ripple, pulse * 0.35, travellingWave, bassKick, beatSector)));
      const glyph = glyphFor(intensity, c.variation);
      const glow = Math.max(20, Math.min(120, Number(settings.glow) || 70)) / 70;
      const alpha = Math.min(1, 0.16 + (d * 0.34 + b * 0.42 + a * 0.48 + ripple * 0.72 + audioIntensity * 0.55) * glow);
      // Bright, saturated colour; ripple gets a soft luminous edge without 3D scaling.
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${color.join(",")})`;
      if (ripple > 0.06) {
        const rippleColor = mix(theme.mid, theme.core, Math.min(1, 0.38 + ripple * 0.72));
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.34 + ripple * 0.82);
        ctx.fillStyle = `rgb(${rippleColor.join(",")})`;
        ctx.shadowColor = `rgb(${rippleColor.join(",")})`;
        ctx.shadowBlur = 8 + ripple * 14;
        // Two flat passes create a bright 2D neon ripple, not a raised/3D effect.
        ctx.fillText(glyph === "." || glyph === ":" ? "+" : glyph, c.x, c.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = Math.min(1, 0.52 + ripple * 0.48);
        ctx.fillText(glyph, c.x, c.y);
        ctx.restore();
      } else if (audioIntensity > 0.12) {
        ctx.save();
        const pop = Math.max(ripple, travellingWave * 0.72, pulse * 0.48, bassKick, beatSector * 1.35);
        const scale = 1 + pop * 1.28 + a * 0.12;
        const edgeLift = Math.max(bassKick * (6 + smoothedBass * 20), beatSector * 48);
        ctx.translate(c.x, c.y - Math.max(ripple * 28, travellingWave * 16, pulse * 5, edgeLift));
        ctx.scale(scale, scale);
        ctx.fillText(glyph, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(glyph, c.x, c.y);
      }
    }
    drawScrollParticles(now, theme);
    ctx.globalAlpha = 1;
    if (trail.length || bursts.length || scrollParticles.length || audioActive || smoothedBass > 0.008 || beatPulses.length) schedule();
  }

  addEventListener("resize", resize, { passive: true });
  resize();
})();