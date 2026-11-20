# ASCII Flow v3.0

A customizable interactive ASCII field for Chrome, now with an opt-in audio visualizer.

## Audio Reactive Mode
- Click **Enable Audio Reaction** in the extension popup while on the tab you want to visualize.
- The extension analyses that tab's audio locally using Web Audio frequency data.
- Loud bass is focused on characters near the left and right screen edges, which jump and enlarge on heavy hits.
- The centre stays comparatively calm instead of the whole screen jumping together.
- Detected beats still create travelling waves across the field.
- Audio sensitivity and beat impact can be adjusted in the popup.
- Click **Stop Audio Reaction** to stop capture. Press Escape to turn the overlay off and stop audio capture.

Audio capture is not started automatically. Chrome's tab-capture permission is used only after the user presses the audio button. Captured audio is routed back to the tab so playback remains audible.

## Existing features
- Eight colour themes and custom core/middle/outer colours.
- Live theme and custom-colour preview.
- Adjustable mouse trail size, lifetime and glow.
- Mouse trails and click ripples continue to work during audio mode.
- Settings are stored locally with Chrome extension storage.

## Install
1. Extract the ZIP.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Remove the previous unpacked ASCII Flow version.
5. Click **Load unpacked** and select the extracted `ascii-chrome-extension-v2.0` folder.
6. Refresh the page you want to visualize.
7. Open the ASCII Flow toolbar popup and click **Enable Audio Reaction**.

Audio mode works on tabs where Chrome allows tab audio capture. It cannot capture protected or restricted browser pages.


### v3.0 popup and icon update
- Restores the v2.1 audio reaction behaviour.
- Audio sensitivity and beat/bass impact are fixed at 55% and 35%; controls removed from the popup.
- Live preview now displays actual ASCII glyphs instead of a drawn vector line.
- Added custom neon ASCII extension icons at 16, 32, 48 and 128 px.


### v3.0 preview and audio tuning
- Fixed audio sensitivity at 35%; beat/bass impact remains fixed at 35%.
- Rebuilt the popup preview as a square visual with three concentric ASCII character rings around a central cursor marker.


### v3.0 audio tuning
- Fixed audio sensitivity at 45%.
- Fixed beat/bass impact at 25%.


### v3.0 audio controls and fluidity
- Audio sensitivity defaults to 115% and beat/bass impact defaults to 20%; both are adjustable in the popup.
- Bass response uses a smoothed envelope with a rounded attack and slower release to reduce abrupt jumps.


### v3.0 preview and beat update
- Audio controls are fixed at 100% sensitivity and 20% beat/bass impact.
- Preview is a square radial ASCII energy cluster over a dotted field, based on the supplied reference.
- Each detected beat triggers one focused angular sector, with the strongest jump at its centre and a smooth decay.


### v3.0 beat waveform tuning
- Sensitivity fixed at 100%; beat/bass impact fixed at 30%.
- Beat hits form a seven-bar waveform burst in one selected perimeter section. The centre bar jumps highest and neighboring bars taper symmetrically.
- The burst eases out smoothly rather than snapping off.


### v3.0 horizontal ASCII waveform
- Audio mode now renders a horizontal ASCII spectrum over a subtle dotted matrix.
- Frequency bands drive individual column heights.
- Each detected beat selects one position for a tall waveform peak, with neighboring columns tapering down symmetrically.
- Beat peaks fade smoothly.


### v3.0 waveform refinement
- Waveform sits near the bottom edge of the screen.
- Increased visual scale and peak height.
- Vocal/midrange frequencies receive additional emphasis.
- Neighboring waveform points are smoothed into a continuous, rounded line rather than disconnected vertical bars.
- Beat detection also responds to midrange/vocal transients.


## Version 3.1.0 updates
- Mouse trails and click ripples now render over the audio waveform while audio capture is active.
- Page background brightness is detected and the theme colours are inverted on light backgrounds for contrast.
- Click ripples expand across the viewport diagonal before fading.
