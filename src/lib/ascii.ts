import { AsciiCell, AsciiFrame, AsciiSettings } from "@/types";
import { ART_STYLE_CHARS, LETTER_SET_CHARS, COLOR_MODE_TINTS, BAYER_8X8, ASPECT_RATIO_VALUES } from "./constants";
import { sampleDepthMap } from "./depth-utils";

/**
 * Convert a video/image source to an ASCII frame.
 */
export function convertToAscii(
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  settings: AsciiSettings,
  samplingCanvas: HTMLCanvasElement,
  depthMap?: { data: Float32Array; width: number; height: number } | null
): AsciiFrame {
  const {
    artStyle, letterSet, ditherAlgorithm, ditherStrength,
    brightness, contrast, colorMode, inverted,
    fontSize, characterSpacing, aspectRatio,
    depthEnabled, depthStrength, mirrored,
  } = settings;

  const chars = letterSet !== "standard"
    ? LETTER_SET_CHARS[letterSet]
    : ART_STYLE_CHARS[artStyle];

  let srcWidth: number;
  let srcHeight: number;
  if (source instanceof HTMLVideoElement) {
    srcWidth = source.videoWidth;
    srcHeight = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    srcWidth = source.naturalWidth;
    srcHeight = source.naturalHeight;
  } else {
    srcWidth = source.width;
    srcHeight = source.height;
  }

  if (srcWidth === 0 || srcHeight === 0) return [];

  // ── Aspect ratio cropping ──
  let cropX = 0, cropY = 0, cropW = srcWidth, cropH = srcHeight;
  const targetRatio = ASPECT_RATIO_VALUES[aspectRatio];
  if (targetRatio) {
    const srcRatio = srcWidth / srcHeight;
    if (srcRatio > targetRatio) {
      // Source wider than target — crop sides
      cropW = Math.floor(srcHeight * targetRatio);
      cropX = Math.floor((srcWidth - cropW) / 2);
    } else {
      // Source taller than target — crop top/bottom
      cropH = Math.floor(srcWidth / targetRatio);
      cropY = Math.floor((srcHeight - cropH) / 2);
    }
  }

  const density = Math.max(2, Math.round(fontSize * 0.8 * characterSpacing));
  const cols = Math.floor(cropW / density);
  const rows = Math.floor(cropH / (density * 2));

  if (cols === 0 || rows === 0) return [];

  samplingCanvas.width = cols;
  samplingCanvas.height = rows;

  const ctx = samplingCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  // Draw cropped region into sampling canvas
  if (mirrored) {
    ctx.save();
    ctx.translate(cols, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cols, rows);
  if (mirrored) {
    ctx.restore();
  }

  const imageData = ctx.getImageData(0, 0, cols, rows);
  const pixels = imageData.data;

  // Build brightness map
  const brightnessMap: number[] = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const pi = i * 4;
    let lum = (0.299 * pixels[pi] + 0.587 * pixels[pi + 1] + 0.114 * pixels[pi + 2]) / 255;
    lum = (lum + brightness - 0.5) * contrast + 0.5;
    lum = Math.max(0, Math.min(1, lum));
    if (inverted) lum = 1 - lum;
    if (depthEnabled && depthMap) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      const depth = sampleDepthMap(depthMap.data, depthMap.width, depthMap.height, x, y, cols, rows);
      lum *= 1 - depth * depthStrength;
    }
    brightnessMap[i] = lum;
  }

  // Apply dithering
  const dithered = applyDithering(brightnessMap, cols, rows, chars.length, ditherAlgorithm, ditherStrength);

  // Build frame — store raw brightness in alpha-like channel via the `b` field trick:
  // For matrix mode, we need the TRUE source brightness in the renderer.
  // We encode it into the cell: r=rawBrightness*255 (when matrix), g/b = tinted color.
  // Actually simpler: just store the raw lum as the cell color, and let the renderer
  // handle the green tinting. This way the renderer always has the true brightness.
  const tint = COLOR_MODE_TINTS[colorMode];
  const frame: AsciiFrame = [];

  for (let y = 0; y < rows; y++) {
    const row: AsciiCell[] = [];
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const charIndex = dithered[idx];
      const char = chars[charIndex];
      const lum = brightnessMap[idx];
      const pi = idx * 4;

      let cr: number, cg: number, cb: number;
      if (colorMode === "color") {
        cr = pixels[pi];
        cg = pixels[pi + 1];
        cb = pixels[pi + 2];
      } else if (tint) {
        // For matrix/amber: store raw brightness in R channel
        // so the canvas renderer can extract true source brightness.
        // G and B carry the tinted color as before.
        cr = Math.round(lum * 255);  // raw brightness (not tinted)
        cg = Math.round(tint.g * lum);
        cb = Math.round(tint.b * lum);
      } else {
        const v = Math.round(lum * 255);
        cr = v; cg = v; cb = v;
      }

      row.push({ char, r: cr, g: cg, b: cb });
    }
    frame.push(row);
  }

  return frame;
}

function applyDithering(
  brightnessMap: number[], cols: number, rows: number,
  numChars: number, algorithm: string, strength: number
): number[] {
  const result = new Array(cols * rows);

  if (algorithm === "floyd-steinberg") {
    const errors = [...brightnessMap];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const oldVal = Math.max(0, Math.min(1, errors[idx]));
        const charIdx = Math.round(oldVal * (numChars - 1));
        result[idx] = Math.max(0, Math.min(numChars - 1, charIdx));
        const newVal = charIdx / (numChars - 1);
        const error = (oldVal - newVal) * strength;
        if (x + 1 < cols) errors[idx + 1] += error * 7 / 16;
        if (y + 1 < rows) {
          if (x - 1 >= 0) errors[(y + 1) * cols + (x - 1)] += error * 3 / 16;
          errors[(y + 1) * cols + x] += error * 5 / 16;
          if (x + 1 < cols) errors[(y + 1) * cols + (x + 1)] += error * 1 / 16;
        }
      }
    }
  } else if (algorithm === "bayer") {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const threshold = BAYER_8X8[y % 8][x % 8] / 64 - 0.5;
        const adjusted = brightnessMap[idx] + threshold * strength * 0.5;
        const clamped = Math.max(0, Math.min(1, adjusted));
        result[idx] = Math.max(0, Math.min(numChars - 1, Math.round(clamped * (numChars - 1))));
      }
    }
  } else {
    for (let i = 0; i < cols * rows; i++) {
      result[i] = Math.max(0, Math.min(numChars - 1, Math.floor(brightnessMap[i] * (numChars - 1))));
    }
  }

  return result;
}
