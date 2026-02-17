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
      className="flex items-center justify-between px-4 h-9 border-t border-zinc-800 bg-black/50 shrink-0 text-[10px] uppercase tracking-wider"
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
      </div>

      {/* Right: Status */}
      <div className="text-zinc-600">
        ASCII DITHER SYSTEM
      </div>
    </div>
  );
}
