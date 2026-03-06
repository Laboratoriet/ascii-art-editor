"use client";

import { useRef } from "react";
import {
  AsciiSettings, ArtStyle, DitherAlgorithm, ColorMode,
  SourceType, FontOption, LetterSet, FxPreset, AspectRatio,
} from "@/types";
import {
  ART_STYLE_LABELS, DITHER_LABELS, COLOR_MODE_LABELS,
  FONT_LABELS, LETTER_SET_LABELS, FX_PRESET_LABELS,
} from "@/lib/constants";
import { Upload, Camera, CameraOff, SwitchCamera } from "lucide-react";

import SectionBox from "@/components/ui/SectionBox";
import ChipButton from "@/components/ui/ChipButton";
import TabButton from "@/components/ui/TabButton";
import Dropdown from "@/components/ui/Dropdown";
import SliderField from "@/components/ui/SliderField";
import InfoRow from "@/components/ui/InfoRow";
import SectionLabel from "@/components/ui/SectionLabel";

const ASPECT_RATIOS: AspectRatio[] = ["original", "16:9", "4:3", "1:1", "3:4", "9:16"];

export interface ControlContentProps {
  settings: AsciiSettings;
  onChange: (settings: AsciiSettings) => void;
  sourceType: SourceType;
  onSourceChange: (type: SourceType) => void;
  onFileSelect: (file: File) => void;
  onWebcamStart: (deviceId?: string) => void;
  onWebcamStop: () => void;
  isWebcamActive: boolean;
  onExport: () => void;
  onRandom: () => void;
  // Camera devices
  devices?: MediaDeviceInfo[];
  selectedDeviceId?: string;
  onDeviceSelect?: (deviceId: string) => void;
  // Display zoom
  displayZoom?: number;
  onZoomChange?: (zoom: number) => void;
  // Depth estimation
  isDepthLoading?: boolean;
  depthLoadProgress?: number;
  depthLoadStatus?: string;
  isDepthReady?: boolean;
  // Mobile
  isMobile?: boolean;
  // Whether sections should default to collapsed
  defaultCollapsed?: boolean;
}

export default function ControlContent({
  settings, onChange, sourceType, onSourceChange,
  onFileSelect, onWebcamStart, onWebcamStop,
  isWebcamActive, onExport, onRandom,
  devices = [], selectedDeviceId = "", onDeviceSelect,
  displayZoom = 1, onZoomChange,
  isDepthLoading = false, depthLoadProgress = 0, depthLoadStatus = "",
  isDepthReady = false,
  isMobile = false, defaultCollapsed = false,
}: ControlContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<AsciiSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const hasMultipleDevices = devices.length > 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-right ml-auto shrink-0">
          <h2 className="text-2xl tracking-tight leading-none">
            <span className="text-white font-light">ASCII</span>{" "}
            <a
              href="https://www.alkemist.no"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white hover:text-amber-400 transition-colors"
            >
              ALKEMIST
            </a>
          </h2>
        </div>
      </div>

      {/* ── SOURCE ── */}
      <SectionBox label="Source" collapsible defaultExpanded>
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
            <p className="text-xs text-zinc-400">
              Drop image/video or click to browse
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              JPG, PNG, GIF, MP4, WebM
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
          <div className="space-y-2">
            {!isWebcamActive ? (
              <button
                onClick={() => onWebcamStart(selectedDeviceId || undefined)}
                className="flex items-center gap-2 w-full justify-center px-4 py-3 border border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 rounded text-xs uppercase tracking-wider transition-colors"
              >
                <Camera size={14} />
                Start Camera
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={onWebcamStop}
                  className="flex-1 flex items-center gap-2 justify-center px-4 py-3 border border-red-900/50 text-red-400 hover:border-red-700 rounded text-xs uppercase tracking-wider transition-colors"
                >
                  <CameraOff size={14} />
                  Stop
                </button>
                {isMobile && hasMultipleDevices && (
                  <button
                    onClick={() => {
                      const currentIdx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
                      const nextIdx = (currentIdx + 1) % devices.length;
                      const nextId = devices[nextIdx].deviceId;
                      onDeviceSelect?.(nextId);
                      onWebcamStart(nextId);
                    }}
                    className="flex items-center justify-center px-3 py-3 border border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 rounded transition-colors"
                  >
                    <SwitchCamera size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Device selector (desktop) */}
            {!isMobile && isWebcamActive && hasMultipleDevices && (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  onDeviceSelect?.(e.target.value);
                  onWebcamStart(e.target.value);
                }}
                className="w-full bg-zinc-900 text-zinc-300 rounded px-3 py-2 text-xs border border-zinc-800 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${devices.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </SectionBox>

      {/* ── STYLE ── */}
      <SectionBox label="Style" collapsible defaultExpanded={!defaultCollapsed}>
        {/* Art Style chips */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
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

        {/* Font + Dither side by side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <SectionLabel>Font</SectionLabel>
            <Dropdown
              value={settings.font}
              options={FONT_LABELS}
              onChange={(v) => update({ font: v as FontOption })}
            />
          </div>
          <div>
            <SectionLabel>Dither</SectionLabel>
            <Dropdown
              value={settings.ditherAlgorithm}
              options={DITHER_LABELS}
              onChange={(v) => update({ ditherAlgorithm: v as DitherAlgorithm })}
            />
          </div>
        </div>

        {/* Letter Set */}
        <SectionLabel>Letter Set</SectionLabel>
        <Dropdown
          value={settings.letterSet}
          options={LETTER_SET_LABELS}
          onChange={(v) => update({ letterSet: v as LetterSet })}
        />
      </SectionBox>

      {/* ── RENDERING ── */}
      <SectionBox label="Rendering" collapsible defaultExpanded={!defaultCollapsed}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SliderField
            label="Zoom"
            value={displayZoom}
            min={0.5} max={4} step={0.1}
            display={`${displayZoom.toFixed(1)}x`}
            onChange={(v) => onZoomChange?.(v)}
            accent
          />
          <SliderField
            label="Spacing"
            value={settings.characterSpacing}
            min={0.5} max={2} step={0.05}
            display={`${settings.characterSpacing.toFixed(2)}x`}
            onChange={(v) => update({ characterSpacing: v })}
          />
          <SliderField
            label="Hover"
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
            label="Dither"
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

        {/* Aspect ratio buttons — shown here on mobile since BottomBar is hidden */}
        {isMobile && (
          <div className="mt-3 pt-3 border-t border-zinc-800/40">
            <SectionLabel>Aspect Ratio</SectionLabel>
            <div className="flex flex-wrap gap-1">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => update({ aspectRatio: ratio })}
                  className={`px-2 py-1.5 rounded text-xs tracking-wider transition-all ${
                    settings.aspectRatio === ratio
                      ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                      : "text-zinc-600 border border-zinc-800 hover:text-zinc-400"
                  }`}
                >
                  {ratio === "original" ? "ORIG" : ratio}
                </button>
              ))}
              <div className="w-px h-6 bg-zinc-800 mx-1 self-center" />
              <button
                onClick={() => update({ inverted: !settings.inverted })}
                className={`px-2 py-1.5 rounded text-xs tracking-wider transition-all ${
                  settings.inverted
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                    : "text-zinc-600 border border-zinc-800 hover:text-zinc-400"
                }`}
              >
                INV
              </button>
              <button
                onClick={() => update({ mirrored: !settings.mirrored })}
                className={`px-2 py-1.5 rounded text-xs tracking-wider transition-all ${
                  settings.mirrored
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                    : "text-zinc-600 border border-zinc-800 hover:text-zinc-400"
                }`}
              >
                MIRROR
              </button>
            </div>
          </div>
        )}
      </SectionBox>

      {/* ── EFFECTS ── */}
      <SectionBox label="Effects" collapsible defaultExpanded={!defaultCollapsed}>
        {/* Depth Estimation */}
        <SectionLabel>Depth</SectionLabel>
        <div className="flex items-center gap-2 mb-3">
          <ChipButton
            active={settings.depthEnabled}
            onClick={() => update({ depthEnabled: !settings.depthEnabled })}
          >
            {settings.depthEnabled ? "ON" : "OFF"}
          </ChipButton>
          {isDepthLoading && (
            <span className="text-[10px] text-zinc-500">
              {depthLoadStatus} {depthLoadProgress > 0 && `${depthLoadProgress}%`}
            </span>
          )}
          {isDepthReady && settings.depthEnabled && (
            <span className="text-[10px] text-emerald-600">Ready</span>
          )}
        </div>
        {settings.depthEnabled && (
          <div className="mb-3">
            <SliderField
              label="Depth Strength"
              value={settings.depthStrength}
              min={0} max={1} step={0.05}
              display={settings.depthStrength.toFixed(2)}
              onChange={(v) => update({ depthStrength: v })}
            />
          </div>
        )}

        {/* Color Mode */}
        <SectionLabel>Color Mode</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
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

        {/* FX Preset */}
        <SectionLabel>FX Preset</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
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

        {/* FX sliders */}
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
      </SectionBox>

      {/* ── INFO ── */}
      <SectionBox label="Info" collapsible defaultExpanded={!defaultCollapsed}>
        <div className="space-y-1">
          <InfoRow label="STYLE" value={ART_STYLE_LABELS[settings.artStyle].toUpperCase()} />
          <InfoRow label="FONT" value={FONT_LABELS[settings.font].toUpperCase()} />
          <InfoRow label="ALG" value={settings.ditherAlgorithm === "none" ? "DIRECT" : settings.ditherAlgorithm === "floyd-steinberg" ? "FLOYD-STEINBERG" : "BAYER8X8"} />
          <InfoRow label="AR" value={settings.aspectRatio.toUpperCase()} />
          <InfoRow label="FX" value={FX_PRESET_LABELS[settings.fxPreset].toUpperCase()} />
        </div>
      </SectionBox>
    </div>
  );
}
