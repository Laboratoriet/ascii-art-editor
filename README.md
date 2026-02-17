# ASCII Dither System

A real-time ASCII art generator that converts images, videos, and live webcam feeds into animated ASCII characters. Built with Next.js, TypeScript, and canvas rendering.

Inspired by [Meng To's ASCII Dither System](https://x.com/MengTo).

## Features

- **Three input sources** -- drag-and-drop images, video files, or live webcam
- **Real-time conversion** -- video and webcam render at full frame rate via canvas
- **6 art styles** -- Classic, Particles, Letters, Code, Retro (block chars), Terminal
- **4 color modes** -- Grayscale, Full Color, Matrix Green, Amber Monitor
- **7 FX presets** -- Noise Field, Intervals, Beam Sweep, Glitch, CRT Monitor, Matrix Rain
- **Matrix Rain** -- falling katakana columns with motion-reactive highlighting
- **Motion detection** -- moving areas in video/webcam glow brighter with white gradient shift
- **Hover dispersal** -- characters scatter and brighten near the cursor
- **Dithering** -- Floyd-Steinberg error diffusion and Bayer 8x8 ordered dithering
- **Aspect ratio cropping** -- Original, 16:9, 4:3, 1:1, 3:4, 9:16
- **Drag to pan** -- click and drag the canvas, double-click to reset
- **Export** -- download the current frame as PNG
- **Randomize** -- generate random combinations of all settings

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    layout.tsx              Root layout, font loading (Inter, JetBrains Mono, VT323, Fira Code)
    page.tsx                Main orchestrator -- all state, source handling, animation loop
    globals.css             Tailwind v4, dark theme, amber accent styling
  components/
    AsciiCanvas.tsx         Canvas renderer -- all FX, motion detection, hover, glow passes
    ControlPanel.tsx        Right sidebar -- art style, sliders, color mode, FX presets
    BottomBar.tsx           Status bar -- FPS counter, aspect ratio buttons, invert toggle
    DragContainer.tsx       Drag-to-pan wrapper using pointer events
  hooks/
    useDrag.ts              Pointer-based drag state (ref-based to avoid stale closures)
    useFps.ts               Frame rate counter (1-second intervals)
  lib/
    ascii.ts                Core conversion: downsample -> brightness map -> dither -> characters
    constants.ts            Character sets, font families, labels, defaults, Bayer matrix
    matrix-rain.ts          MatrixRain class -- falling columns, character mutations, trail queries
  types/
    index.ts                All TypeScript interfaces and union types
```

## How It Works

### Conversion Pipeline

1. **Source capture** -- the image, video frame, or webcam frame is the input
2. **Aspect ratio crop** -- center-crop to the selected ratio before sampling
3. **Downsample** -- draw into a small sampling canvas (`width/density x height/density`)
4. **Brightness map** -- compute per-pixel luminance with brightness/contrast adjustments
5. **Dithering** -- apply Floyd-Steinberg (error diffusion) or Bayer 8x8 (ordered) dithering
6. **Character mapping** -- map quantized brightness to characters from the active set (e.g., ` .:-=+*#%@`)
7. **Color encoding** -- store RGB per cell. For matrix/amber modes, the R channel carries raw brightness so the renderer can extract true source luminance

### Canvas Rendering

Each frame, `AsciiCanvas` iterates over the 2D grid and calls `ctx.fillText` per character with the computed color. On top of that:

- **Hover dispersal** -- mouse position is tracked in grid coordinates; characters within the hover radius are randomly replaced and brightened
- **FX layer** -- applied per-cell (noise, glitch, intervals) or as a post-pass (CRT scanlines, beam sweep)
- **Glow passes** -- for matrix/amber modes, the canvas is composited onto itself with blur for a phosphor glow effect

### Matrix Rain + Motion Detection

The Matrix Rain effect combines two layers:

- **Base layer** -- the source image rendered as green ASCII. Character density preserves image structure (dense chars in bright areas, sparse in dark). Brightness is squared for stronger contrast.
- **Rain overlay** -- falling columns of katakana characters managed by the `MatrixRain` class. Column heads flash white-green, trails fade with distance.

**Motion detection** compares each cell's brightness to the previous frame:

```
motionEnergy = motionEnergy * 0.85 + |currentBrightness - previousBrightness| * 4.0
```

The temporal decay (0.85) means motion energy builds quickly but fades over ~10 frames. Moving areas respond with:

- **Low motion** (0.05-0.3) -- brighter green glow
- **Medium motion** (0.3-0.7) -- green-to-white gradient shift, katakana character swaps
- **Peak motion** (0.7+) -- near-white flash, maximum brightness

## Settings Reference

| Setting | Range | Description |
|---------|-------|-------------|
| Art Style | 6 presets | Character set aesthetic (Classic, Particles, Letters, Code, Retro, Terminal) |
| Font | 4 options | JetBrains Mono, VT323 (Pixel), Fira Code, Courier New |
| Letter Set | 5 options | Override character set (Standard, Mixed, Alphabet, Numbers, Katakana) |
| Dither Algorithm | 3 options | None, Floyd-Steinberg, Bayer 8x8 |
| Dither Strength | 0 - 1 | How aggressively dithering is applied |
| Character Spacing | 0.5 - 2 | Density of the ASCII grid |
| Hover Strength | 0 - 50 | Radius of cursor hover dispersal effect |
| Font Size | 4 - 24 px | Size of rendered characters |
| Brightness | -0.5 - 0.5 | Brightness offset |
| Contrast | 0.5 - 2 | Contrast multiplier |
| Color Mode | 4 modes | Grayscale, Full Color, Matrix Green, Amber Monitor |
| FX Preset | 7 presets | None, Noise Field, Intervals, Beam Sweep, Glitch, CRT Monitor, Matrix Rain |
| FX Strength | 0 - 1 | Intensity of the active FX preset |
| Matrix Scale | 0 - 1 | Speed/density of matrix rain columns |
| Invert | toggle | Invert brightness mapping |
| Aspect Ratio | 6 options | Original, 16:9, 4:3, 1:1, 3:4, 9:16 |

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Canvas API** for rendering
- **lucide-react** for icons

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # Run ESLint
```

## Deploy

Deploy to [Vercel](https://vercel.com) -- push to GitHub and connect the repository. No additional configuration needed.

## License

MIT
