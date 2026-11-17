# ASCII FLOW

### Turn your browser into a living canvas.

ASCII Flow is a creative Chrome extension that transforms ordinary webpages into interactive ASCII experiences. It combines generative typography, neon visuals, mouse interactions, and audio-reactive animations to make browsing feel different.

Move your cursor. Watch characters follow. Click to create ripples. Play music and let the ASCII field react to the rhythm.

**Your browser. Your creativity. Your flow.**

---

## Preview

\<!-- Add your project screenshots or GIFs here -->

\<p align="center">   \<img src="screenshots/ascii-flow-demo.gif" alt="ASCII Flow Demo" width="85%"> \</p>

\<p align="center">   \<i>Replace the preview above with a recording of your extension in action.\</i> \</p>

---

## Features

### 01. Interactive ASCII Mouse Trail

- Characters respond dynamically to cursor movement.
- Smooth, glowing trails follow your mouse.
- Character intensity changes with movement.
- A combination of ASCII symbols creates a living visual field.

### 02. Click Ripple Effects

- Click anywhere on a webpage to create an interactive ripple.
- Characters respond to the ripple as it expands.
- Smooth transitions create a fluid visual experience.

### 03. Audio-Reactive Visualizer

Turn your browser into an audio-responsive visual experience.

- Reacts to music playing in the active browser tab.
- Bass-driven character movement.
- Beat detection triggers concentrated visual reactions.
- Selected sections react more strongly, creating waveform-like jumps.
- Smooth attack and release animations.
- Audio playback remains audible.

**Fixed audio configuration:**

- Sensitivity: 100%
- Beat / bass impact: 30%

Audio reaction is opt-in and starts when the user enables it.

### 04. Multiple Neon Themes

Choose from eight built-in colour themes:

| Theme        | Style                      |
| ------------ | -------------------------- |
| Neon Aurora  | Cyan, purple and pink      |
| Cyber Mint   | Fresh neon green           |
| Solar Flare  | Warm yellow and orange     |
| Arctic Pulse | Cool blue and icy tones    |
| Synthwave    | Retro neon purple and pink |
| Toxic Bloom  | Bright electric green      |
| Deep Ocean   | Cyan and deep blue         |
| Ember Glow   | Fiery orange and red       |

### 05. Customisation

- Custom colour selection.
- Trail size adjustment.
- Trail lifetime adjustment.
- Glow intensity control.
- Live ASCII preview.
- Settings saved between sessions.

### 06. Lightweight Interaction

- Press `ESC` to turn off the overlay.
- Enable or disable the extension through its popup.
- Designed to keep visual effects responsive without unnecessary rendering overhead.

---

## Visual Identity

ASCII Flow uses a minimal, futuristic visual style.

- Dark backgrounds.
- Neon gradients.
- Glowing ASCII characters.
- Generative patterns.
- Terminal-inspired typography.
- Fluid motion and interactive effects.

The goal is simple: transform ordinary browser pages into interactive digital art.

---

## Installation

ASCII Flow can be installed locally using Chrome's Developer Mode.

**Step 1 — Download the project**

Download or clone this repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

**Step 2 — Open Chrome Extensions**

Navigate to:

```text
chrome://extensions
```

**Step 3 — Enable Developer Mode**

Turn on the Developer Mode toggle in the top-right corner.

**Step 4 — Load the extension**

1. Click **Load unpacked**.
2. Select the extracted ASCII Flow project folder.
3. Make sure you select the folder containing `manifest.json`.

**Step 5 — Start exploring**

Open any webpage and experience ASCII Flow.

For audio reaction, play music in the active tab, open the extension popup, and enable Audio Reaction.

---

## How It Works

ASCII Flow uses browser extension technologies to create its visual effects.

| Technology            | Purpose                             |
| --------------------- | ----------------------------------- |
| HTML                  | Extension interface                 |
| CSS                   | Popup styling and visual design     |
| JavaScript            | Interactions and animation logic    |
| Canvas API            | Rendering the ASCII visual field    |
| Chrome Extension APIs | Browser integration and settings    |
| Web Audio API         | Audio analysis and visual reactions |

The extension uses an offscreen document for audio processing and a background service worker to coordinate audio capture.

---

## Project Structure

```text
ascii-flow/
│
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
│
├── content.js
├── background.js
│
├── offscreen.html
├── offscreen.js
│
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
│
└── README.md
```

---

## Privacy

ASCII Flow is designed to keep audio reaction under user control.

- Audio capture starts only after the user explicitly enables it.
- Audio analysis is performed locally by the extension.
- Captured audio is routed back so playback remains audible.
- The extension does not need to upload audio to a remote server for its visualisation.

---

## Future Improvements

Some ideas for future development:

- More generative ASCII patterns.
- Additional visual themes.
- More advanced beat detection.
- Improved audio-reactive effects.
- More customisation options.
- Additional interaction modes.
- Performance optimisations.

---

## Contributing

Ideas, suggestions, and improvements are welcome!

If you find a bug or have an idea for a new visual effect, feel free to open an issue or submit a pull request.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request.

---

## Author

Created with curiosity, creativity, and a lot of JavaScript.

**ASCII FLOW**

*Make the ordinary extraordinary.*

---

\<p align="center">   \<b>Built for people who like their browsers a little less ordinary.\</b> \</p>
