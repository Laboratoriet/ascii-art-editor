import {
  ArtStyle, ColorMode, DitherAlgorithm, AsciiSettings,
  AspectRatio, FontOption, LetterSet, FxPreset,
} from "@/types";

// Character sets per art style
export const ART_STYLE_CHARS: Record<ArtStyle, string> = {
  classic:   " .:-=+*#%@",
  particles: " .·:;oO0@",
  letters:   " .coapAMWB",
  code:      " ._-=+<>{}|",
  retro:     " ░▒▓█",
  terminal:  " ._-|/\\>~#",
};

// Overridable letter sets
export const LETTER_SET_CHARS: Record<LetterSet, string> = {
  standard: "",  // uses art style default
  mixed: " .aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ",
  alphabet: " .ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: " .0123456789",
  katakana: " .ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾙﾚﾛﾜﾝ",
};

export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  classic: "Classic ASCII",
  particles: "Particles",
  letters: "Letters",
  code: "Claude Code",
  retro: "Retro Art",
  terminal: "Terminal",
};

export const FONT_LABELS: Record<FontOption, string> = {
  jetbrains: "JetBrains Mono",
  vt323: "VT323 (Pixel)",
  firacode: "Fira Code",
  courier: "Courier New",
};

export const FONT_FAMILIES: Record<FontOption, string> = {
  jetbrains: '"JetBrains Mono", monospace',
  vt323: '"VT323", monospace',
  firacode: '"Fira Code", monospace',
  courier: '"Courier New", "Courier", monospace',
};

export const LETTER_SET_LABELS: Record<LetterSet, string> = {
  standard: "Standard (@%#*+=:-...)",
  mixed: "Mixed (Aa)",
  alphabet: "Alphabet (A-Z)",
  numbers: "Numbers (0-9)",
  katakana: "Katakana (ｶﾀｶﾅ)",
};

export const DITHER_LABELS: Record<DitherAlgorithm, string> = {
  none: "None",
  "floyd-steinberg": "Floyd-Steinberg",
  bayer: "Bayer 8x8",
};

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  grayscale: "Grayscale",
  color: "Full Color",
  matrix: "Matrix Green",
  amber: "Amber Monitor",
};

export const FX_PRESET_LABELS: Record<FxPreset, string> = {
  none: "None",
  noise: "Noise Field",
  intervals: "Intervals",
  beam: "Beam Sweep",
  glitch: "Glitch",
  crt: "CRT Monitor",
  "matrix-rain": "Matrix Rain",
};

export const COLOR_MODE_TINTS: Record<string, { r: number; g: number; b: number }> = {
  matrix: { r: 0, g: 255, b: 65 },
  amber: { r: 255, g: 176, b: 0 },
};

export const ASPECT_RATIO_VALUES: Record<AspectRatio, number | null> = {
  original: null,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
  "9:16": 9 / 16,
};

export const DEFAULT_SETTINGS: AsciiSettings = {
  artStyle: "classic",
  font: "jetbrains",
  letterSet: "katakana",
  ditherAlgorithm: "floyd-steinberg",
  ditherStrength: 0.8,
  characterSpacing: 1,
  hoverStrength: 24,
  brightness: 0,
  contrast: 1,
  fontSize: 10,
  colorMode: "matrix",
  fxPreset: "none",
  fxStrength: 0.5,
  matrixScale: 0.5,
  inverted: false,
  aspectRatio: "original",
  depthEnabled: false,
  depthStrength: 0.7,
  mirrored: false,
};

// Matrix characters: half-width katakana + digits + some latin
export const MATRIX_CHARS = "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ:・.=*+-<>¦╌";

// Bayer 8x8 matrix
export const BAYER_8X8 = [
  [ 0, 48, 12, 60,  3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [ 8, 56,  4, 52, 11, 59,  7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [ 2, 50, 14, 62,  1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58,  6, 54,  9, 57,  5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];
