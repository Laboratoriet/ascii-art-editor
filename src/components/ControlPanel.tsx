"use client";

import { useRef } from "react";
import {
  AsciiSettings, ArtStyle, DitherAlgorithm, ColorMode,
  SourceType, FontOption, LetterSet, FxPreset,
} from "@/types";
import {
  ART_STYLE_LABELS, DITHER_LABELS, COLOR_MODE_LABELS,
  FONT_LABELS, LETTER_SET_LABELS, FX_PRESET_LABELS,
} from "@/lib/constants";
import { Upload, Camera, CameraOff } from "lucide-react";

interface ControlPanelProps {
  settings: AsciiSettings;
  onChange: (settings: AsciiSettings) => void;
  sourceType: SourceType;
  onSourceChange: (type: SourceType) => void;
  onFileSelect: (file: File) => void;
  onWebcamStart: () => void;
  onWebcamStop: () => void;
  isWebcamActive: boolean;
  onExport: () => void;
  onRandom: () => void;
}

export default function ControlPanel({
  settings, onChange, sourceType, onSourceChange,
  onFileSelect, onWebcamStart, onWebcamStop,
  isWebcamActive, onExport, onRandom,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<AsciiSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="flex flex-col h-full" data-no-drag>
      <div className="flex-1 overflow-y-auto controls-scroll p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-[10px] text-zinc-500 leading-relaxed flex-1">
            Algorithmic ASCII topography generated from your uploaded source.
            Tune contrast, dithering, charset, and render mode to explore
            tension between noise and logic.
          </p>
          <div className="text-right shrink-0">
            <h2 className="text-3xl font-bold text-white tracking-tight leading-none">ASCII</h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] mt-1">
              ASCII Dither System
            </p>
          </div>
        </div>

        {/* SOURCE */}
        <SectionBox label="Source">
          <div className="flex gap-1 mb-3">
            <TabButton
              active={sourceType === "image" || sourceType === "video"}
              onClick={() => onSourceChange("image")}
            >
              IMAGE / VIDEO
            </TabButton>
            <TabButton
              active={sourceType === "webcam"}
              onClick={() => onSourceChange("webcam")}
            >
              LIVE CAM
            </TabButton>
          </div>

          {sourceType !== "webcam" ? (
            <div
              className="border border-dashed border-zinc-700 rounded p-4 text-center cursor-pointer hover:border-zinc-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) onFileSelect(file);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={14} className="mx-auto text-zinc-500 mb-1.5" />
              <p className="text-[11px] text-zinc-400">
                Drop image/video or click to browse
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Supports: JPG, PNG, GIF, MP4, WebM
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div>
              {!isWebcamActive ? (
                <button
                  onClick={onWebcamStart}
                  className="flex items-center gap-2 w-full justify-center px-4 py-3 border border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 rounded text-[11px] uppercase tracking-wider transition-colors"
                >
                  <Camera size={14} />
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={onWebcamStop}
                  className="flex items-center gap-2 w-full justify-center px-4 py-3 border border-red-900/50 text-red-400 hover:border-red-700 rounded text-[11px] uppercase tracking-wider transition-colors"
                >
                  <CameraOff size={14} />
                  Stop Camera
                </button>
              )}
            </div>
          )}
        </SectionBox>

        {/* ART STYLE */}
        <SectionBox label="Art Style">
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(ART_STYLE_LABELS) as ArtStyle[]).map((style) => (
              <ChipButton
                key={style}
                active={settings.artStyle === style}
                onClick={() => update({ artStyle: style })}
              >
                {ART_STYLE_LABELS[style]}
              </ChipButton>
            ))}
          </div>
        </SectionBox>

        {/* FONT + DITHER side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionLabel>Font</SectionLabel>
            <Dropdown
              value={settings.font}
              options={FONT_LABELS}
              onChange={(v) => update({ font: v as FontOption })}
            />
          </div>
          <div>
            <SectionLabel>Dither Algorithm</SectionLabel>
            <Dropdown
              value={settings.ditherAlgorithm}
              options={DITHER_LABELS}
              onChange={(v) => update({ ditherAlgorithm: v as DitherAlgorithm })}
            />
          </div>
        </div>

        {/* LETTER SET */}
        <div>
          <SectionLabel>Letter Set</SectionLabel>
          <Dropdown
            value={settings.letterSet}
            options={LETTER_SET_LABELS}
            onChange={(v) => update({ letterSet: v as LetterSet })}
          />
        </div>

        {/* SLIDERS — 2-column layout */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SliderField
            label="Character Spacing"
            value={settings.characterSpacing}
            min={0.5} max={2} step={0.05}
            display={`${settings.characterSpacing.toFixed(2)}x`}
            onChange={(v) => update({ characterSpacing: v })}
            accent
          />
          <SliderField
            label="Hover Strength"
            value={settings.hoverStrength}
            min={0} max={50} step={1}
            display={`${settings.hoverStrength}`}
            onChange={(v) => update({ hoverStrength: v })}
          />
          <SliderField
            label="Font Size"
            value={settings.fontSize}
            min={4} max={24} step={1}
            display={`${settings.fontSize}px`}
            onChange={(v) => update({ fontSize: v })}
          />
          <SliderField
            label="Brightness"
            value={settings.brightness}
            min={-0.5} max={0.5} step={0.01}
            display={`${Math.round(settings.brightness * 100)}`}
            onChange={(v) => update({ brightness: v })}
          />
          <SliderField
            label="Dither Strength"
            value={settings.ditherStrength}
            min={0} max={1} step={0.05}
            display={settings.ditherStrength.toFixed(1)}
            onChange={(v) => update({ ditherStrength: v })}
          />
          <SliderField
            label="Contrast"
            value={settings.contrast}
            min={0.5} max={2} step={0.05}
            display={settings.contrast.toFixed(1)}
            onChange={(v) => update({ contrast: v })}
          />
        </div>

        {/* COLOR MODE */}
        <div>
          <SectionLabel>Color Mode</SectionLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(COLOR_MODE_LABELS) as ColorMode[]).map((mode) => (
              <ChipButton
                key={mode}
                active={settings.colorMode === mode}
                onClick={() => update({ colorMode: mode })}
              >
                {COLOR_MODE_LABELS[mode]}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* FX PRESET */}
        <div>
          <SectionLabel>FX Preset</SectionLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(FX_PRESET_LABELS) as FxPreset[]).map((fx) => (
              <ChipButton
                key={fx}
                active={settings.fxPreset === fx}
                onClick={() => update({ fxPreset: fx })}
                highlight={fx === "matrix-rain"}
              >
                {FX_PRESET_LABELS[fx]}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* FX STRENGTH + MATRIX SCALE */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SliderField
            label="FX Strength"
            value={settings.fxStrength}
            min={0} max={1} step={0.05}
            display={settings.fxStrength.toFixed(1)}
            onChange={(v) => update({ fxStrength: v })}
          />
          <SliderField
            label="Matrix Scale"
            value={settings.matrixScale}
            min={0} max={1} step={0.05}
            display={settings.matrixScale.toFixed(1)}
            onChange={(v) => update({ matrixScale: v })}
          />
        </div>

        {/* Info Block */}
        <div className="border border-zinc-800/60 rounded p-3 space-y-1">
          <InfoRow label="FMT" value="ASCII CANVAS" />
          <InfoRow label="STYLE" value={ART_STYLE_LABELS[settings.artStyle].toUpperCase()} />
          <InfoRow label="FONT" value={FONT_LABELS[settings.font].toUpperCase()} />
          <InfoRow label="ALG" value={settings.ditherAlgorithm === "none" ? "DIRECT" : settings.ditherAlgorithm === "floyd-steinberg" ? "FLOYD-STEINBERG" : "BAYER8X8"} />
          <InfoRow label="AR" value={settings.aspectRatio.toUpperCase()} />
          <InfoRow label="FX" value={FX_PRESET_LABELS[settings.fxPreset].toUpperCase()} />
          <InfoRow label="BG" value="#000000" />
          <InfoRow label="RES" value="DYNAMIC" />
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="p-4 border-t border-zinc-800/60 flex gap-3">
        <CircleButton onClick={() => {}}>SAVES</CircleButton>
        <CircleButton onClick={onRandom}>RANDOM</CircleButton>
        <CircleButton onClick={onExport} accent>EXPORT</CircleButton>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function SectionBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-800/60 rounded p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-medium mb-2.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-medium mb-1.5">
      {children}
    </p>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-[11px] uppercase tracking-wider font-medium rounded transition-all ${
        active
          ? "text-amber-400 border border-amber-500/40 bg-amber-500/5"
          : "text-zinc-500 border border-zinc-800 hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

function ChipButton({ active, onClick, children, highlight }: {
  active: boolean; onClick: () => void; children: React.ReactNode; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-2 rounded text-[10px] tracking-wider transition-all leading-tight ${
        active
          ? "text-amber-400 border border-amber-500/40 bg-amber-500/10"
          : highlight
            ? "text-emerald-500/60 border border-zinc-800 hover:border-emerald-500/30 bg-zinc-900"
            : "text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 bg-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function Dropdown<T extends string>({ value, options, onChange }: {
  value: T; options: Record<T, string>; onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-zinc-900 text-zinc-300 rounded px-3 py-2.5 text-[11px] border border-zinc-800 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
    >
      {(Object.entries(options) as [T, string][]).map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  );
}

function SliderField({ label, value, min, max, step, display, onChange, accent }: {
  label: string; value: number; min: number; max: number;
  step: number; display: string; onChange: (v: number) => void; accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] uppercase tracking-[0.12em] ${accent ? "text-amber-400/70" : "text-zinc-500"}`}>
          {label}
        </span>
        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent ? "accent-slider" : ""}`}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] text-zinc-600 tracking-wider font-medium">{label}</span>
      <span className="text-[10px] text-zinc-400 tracking-wider font-medium">{value}</span>
    </div>
  );
}

function CircleButton({ onClick, accent, children }: {
  onClick: () => void; accent?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-full text-[10px] uppercase tracking-wider font-semibold transition-all ${
        accent
          ? "bg-zinc-800 text-amber-400 border border-zinc-700 hover:bg-zinc-700 hover:border-amber-500/30"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
