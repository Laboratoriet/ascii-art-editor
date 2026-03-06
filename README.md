# ASCII Dither System

A real-time ASCII art generator that converts images, videos, and live webcam feeds into animated ASCII characters. Built with Next.js, TypeScript, and canvas rendering.

Inspired by [Meng To's ASCII Dither System](https://x.com/MengTo).

**Live Demo:** [ascii-art-editor.vercel.app](https://ascii-art-editor.vercel.app)
**Repository:** [github.com/Laboratoriet/ascii-art-editor](https://github.com/Laboratoriet/ascii-art-editor)

---

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
- **Camera device selection** -- choose between multiple cameras, persisted to localStorage
- **Fullscreen mode** -- hide sidebar for distraction-free viewing, Escape to exit
- **Collapsible sections** -- accordion UI with smooth open/close transitions
- **Mobile responsive** -- slide-out drawer, touch-friendly controls, safe area support (iOS)

---

## Getting Started

```bash
git clone https://github.com/Laboratoriet/ascii-art-editor.git
cd ascii-art-editor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Rendering | Canvas API (`ctx.fillText` per character) |
| Icons | lucide-react |
| Fonts | Inter, JetBrains Mono, VT323, Fira Code (via `next/font/google`) |
| Hosting | Vercel |

No external animation libraries. All effects (matrix rain, glitch, CRT scanlines, glow) are implemented with raw canvas operations.

---

## Project Structure

```
src/
  app/
    layout.tsx              Root layout -- font loading, metadata, viewport config
    page.tsx                Main orchestrator -- state, source handling, animation loop, responsive layout
    globals.css             Tailwind v4 config, dark theme, safe area utils, touch-friendly styles
  components/
    AsciiCanvas.tsx         Canvas renderer -- FX, motion detection, hover, glow passes
    ControlPanel.tsx        Desktop sidebar shell wrapping ControlContent
    ControlContent.tsx      Shared section layout -- 5 accordion sections, camera UI
    MobileDrawer.tsx        Slide-out drawer for mobile -- backdrop, scroll lock, safe areas
    BottomBar.tsx           Status bar -- FPS counter, aspect ratio buttons (hidden on mobile)
    DragContainer.tsx       Drag-to-pan wrapper using pointer events
    ui/
      SectionBox.tsx        Collapsible section wrapper with chevron animation
      ChipButton.tsx        Style/FX/color selection chips
      TabButton.tsx         Source type tabs
      Dropdown.tsx          Generic <select> wrapper
      SliderField.tsx       Label + value + range input
      CircleButton.tsx      Bottom action buttons
      InfoRow.tsx           Label-value info pairs
      SectionLabel.tsx      Section heading text
  hooks/
    useDrag.ts              Pointer-based drag state (ref-based to avoid stale closures)
    useFps.ts               Frame rate counter (1-second sampling intervals)
    useMediaQuery.ts        matchMedia listener for responsive breakpoints
    useMediaDevices.ts      Video device enumeration + localStorage persistence
    useFullscreen.ts        Sidebar hide/show toggle with Escape key support
  lib/
    ascii.ts                Core conversion: downsample -> brightness -> dither -> characters
    constants.ts            Character sets, font families, labels, defaults, Bayer matrix
    matrix-rain.ts          MatrixRain class -- falling columns, character mutations, trail queries
  types/
    index.ts                All TypeScript interfaces and union types
```

---

## Architecture

### Data Flow

```
Source (image/video/webcam)
    |
    v
page.tsx (orchestrator)
    |-- convertToAscii() returns AsciiFrame (2D grid of { char, r, g, b })
    |
    v
AsciiCanvas.tsx (renderer)
    |-- iterates grid, calls ctx.fillText per character
    |-- applies FX layer (noise, glitch, beam, CRT, matrix rain)
    |-- composites glow passes for matrix/amber modes
    |
    v
<canvas> element (displayed in DragContainer)
```

### Conversion Pipeline (`ascii.ts`)

1. **Source capture** -- the image, video frame, or webcam frame is the input
2. **Aspect ratio crop** -- center-crop to the selected ratio before sampling
3. **Downsample** -- draw into a small sampling canvas (`width/density x height/density`)
4. **Brightness map** -- compute per-pixel luminance with brightness/contrast adjustments
5. **Dithering** -- apply Floyd-Steinberg (error diffusion) or Bayer 8x8 (ordered) dithering
6. **Character mapping** -- map quantized brightness to characters from the active set (e.g., ` .:-=+*#%@`)
7. **Color encoding** -- store RGB per cell. For matrix/amber modes, the R channel carries raw brightness so the renderer can extract true source luminance

### Canvas Rendering (`AsciiCanvas.tsx`)

Each frame, the renderer iterates the 2D grid and calls `ctx.fillText` per character with the computed color. On top of that:

- **Hover dispersal** -- mouse position tracked in grid coordinates; characters within hover radius are randomly replaced and brightened
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

| Motion Level | Energy Range | Visual Response |
|-------------|-------------|-----------------|
| Low | 0.05 - 0.3 | Brighter green glow |
| Medium | 0.3 - 0.7 | Green-to-white gradient shift, katakana character swaps |
| Peak | 0.7+ | Near-white flash, maximum brightness |

### Drag-to-Pan (`DragContainer.tsx` + `useDrag.ts`)

Uses pointer events with `setPointerCapture` for smooth dragging. All state is ref-based to avoid stale closures in the pointer move handler. Double-click resets position with an eased transition.

### FPS Counter (`useFps.ts`)

Counts `requestAnimationFrame` ticks within 1-second intervals. Updated via the `tick()` callback called from the animation loop in `page.tsx`.

---

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

### Default Values

```typescript
{
  artStyle: "classic",
  font: "jetbrains",
  letterSet: "standard",
  ditherAlgorithm: "floyd-steinberg",
  ditherStrength: 0.8,
  characterSpacing: 1,
  hoverStrength: 24,
  brightness: 0,
  contrast: 1,
  fontSize: 10,
  colorMode: "grayscale",
  fxPreset: "none",
  fxStrength: 0.5,
  matrixScale: 0.5,
  inverted: false,
  aspectRatio: "original",
}
```

---

## Character Sets

| Art Style | Characters |
|-----------|-----------|
| Classic | ` .:-=+*#%@` |
| Particles | ` .·:;oO0@` |
| Letters | ` .coapAMWB` |
| Code | ` ._-=+<>{}|` |
| Retro | ` ░▒▓█` |
| Terminal | ` ._-\|/\\>~#` |

**Letter Set overrides** replace the art style characters:

| Letter Set | Characters |
|-----------|-----------|
| Standard | Uses art style default |
| Mixed | ` .aAbBcC...xXyYzZ` |
| Alphabet | ` .ABCDEFGHIJKLMNOPQRSTUVWXYZ` |
| Numbers | ` .0123456789` |
| Katakana | ` .ｦｱｲｳｴｵｶｷｸｹｺ...ﾜﾝ` |

---

## FX Presets

| Preset | Type | How It Works |
|--------|------|-------------|
| Noise Field | Per-cell | Random character/brightness replacement at `fxStrength * 10%` probability |
| Intervals | Per-cell | Horizontal bands where alternating rows are blanked based on band size |
| Beam Sweep | Per-cell | Horizontal bright line sweeps vertically, +-4 rows glow with distance falloff |
| Glitch | Per-row | Horizontal offset on random rows using seeded pseudo-random hash |
| CRT Monitor | Post-pass | 3px scanlines + radial vignette gradient overlay |
| Matrix Rain | Overlay | Full matrix rain system with motion detection (see Architecture section) |

---

## Styling

The UI uses a dark theme with amber accents. Key design decisions:

- **Black background** (`#000000`) everywhere -- canvas, sidebar, bottom bar
- **Amber accent** (`#fbbf24`) for active states, selected chips, export button
- **Zinc scale** for text hierarchy (zinc-300 to zinc-700)
- **Custom range inputs** -- 2px track, 12px circular thumb, amber on active
- **Custom scrollbar** -- 3px width, zinc-800 thumb, transparent track
- **Custom select dropdown** -- SVG chevron background image, no native appearance
- **Typography** -- Inter for UI text, monospace fonts for the canvas

---

## Deployment

The project is deployed on Vercel with automatic GitHub integration:

- **Push to `main`** triggers a production deployment
- **Pull requests** get preview deployments
- **No environment variables** needed -- everything runs client-side

To deploy your own fork:

1. Fork the repository
2. Import into [Vercel](https://vercel.com)
3. Deploy -- no configuration needed

---

## Browser Support

Requires a modern browser with:

- Canvas API (`CanvasRenderingContext2D.fillText`)
- `requestAnimationFrame`
- `getUserMedia` (for webcam)
- Pointer Events (for drag-to-pan)
- CSS `backdrop-filter` support (for glow effects)

Tested in Chrome, Firefox, Safari, and Edge.

---

## License

MIT
