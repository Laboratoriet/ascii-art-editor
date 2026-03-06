"use client";

import { AspectRatio, AsciiSettings } from "@/types";

const ASPECT_RATIOS: AspectRatio[] = ["original", "16:9", "4:3", "1:1", "3:4", "9:16"];

interface BottomBarProps {
  fps: number;
  settings: AsciiSettings;
  onChange: (settings: AsciiSettings) => void;
  hasSource: boolean;
}

export default function BottomBar({ fps, settings, onChange, hasSource }: BottomBarProps) {
  return (
    <div
      className="hidden md:flex items-center justify-between px-4 h-9 border-t border-zinc-800 bg-black/50 shrink-0 text-xs uppercase tracking-wider"
      data-no-drag
    >
      {/* Left: FPS */}
      <div className="flex items-center gap-4">
        <span className="text-zinc-500">
          FPS <span className="text-zinc-300 ml-1 font-mono tabular-nums">{hasSource ? fps || "--" : "--"}</span>
        </span>
      </div>

      {/* Center: Aspect ratios */}
      <div className="flex items-center gap-1">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange({ ...settings, aspectRatio: ratio })}
            className={`px-2 py-1 rounded transition-all ${
              settings.aspectRatio === ratio
                ? "text-amber-400 bg-amber-500/10"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {ratio === "original" ? "ORIGINAL" : ratio}
          </button>
        ))}
        <div className="w-px h-4 bg-zinc-800 mx-2" />
        <button
          onClick={() => onChange({ ...settings, inverted: !settings.inverted })}
          className={`px-2 py-1 rounded transition-all ${
            settings.inverted
              ? "text-amber-400 bg-amber-500/10"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          INV
        </button>
        <button
          onClick={() => onChange({ ...settings, mirrored: !settings.mirrored })}
          className={`px-2 py-1 rounded transition-all ${
            settings.mirrored
              ? "text-amber-400 bg-amber-500/10"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          MIRROR
        </button>
      </div>

      {/* Right: Branding */}
      <a
        href="https://www.alkemist.no"
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <span className="text-zinc-400 font-bold">ALKEMIST</span> ASCII Dither System
      </a>
    </div>
  );
}
