export interface AsciiCell {
  char: string;
  r: number;
  g: number;
  b: number;
}

export type AsciiFrame = AsciiCell[][];

export type SourceType = "image" | "video" | "webcam";

export type ArtStyle = "classic" | "rain" | "letters" | "code" | "retro" | "terminal";

export type DitherAlgorithm = "none" | "floyd-steinberg" | "bayer";

export type ColorMode = "grayscale" | "color" | "matrix" | "amber";

export type AspectRatio = "original" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";

export type FontOption = "jetbrains" | "vt323" | "firacode" | "courier";

export type LetterSet = "standard" | "mixed" | "alphabet" | "numbers" | "katakana";

export type FxPreset = "none" | "noise" | "intervals" | "beam" | "glitch" | "crt" | "matrix-rain";

export interface AsciiSettings {
  artStyle: ArtStyle;
  font: FontOption;
  letterSet: LetterSet;
  ditherAlgorithm: DitherAlgorithm;
  ditherStrength: number;
  characterSpacing: number;
  hoverStrength: number;     // 0-50, radius of hover dispersal
  brightness: number;
  contrast: number;
  fontSize: number;
  colorMode: ColorMode;
  fxPreset: FxPreset;
  fxStrength: number;        // 0-1
  matrixScale: number;       // 0-1, density of matrix rain columns
  inverted: boolean;
  aspectRatio: AspectRatio;
  depthEnabled: boolean;
  depthStrength: number;  // 0-1
  mirrored: boolean;
}

export interface DragState {
  x: number;
  y: number;
  isDragging: boolean;
}

// Matrix rain column state
export interface RainColumn {
  y: number;
  speed: number;
  length: number;
  chars: string[];
  active: boolean;
}
