"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  AsciiFrame, AsciiSettings, SourceType, ArtStyle,
  ColorMode, FxPreset, FontOption, LetterSet,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { convertToAscii } from "@/lib/ascii";
import { useFps } from "@/hooks/useFps";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useDepthEstimation } from "@/hooks/useDepthEstimation";
import AsciiCanvas from "@/components/AsciiCanvas";
import ControlPanel from "@/components/ControlPanel";
import BottomBar from "@/components/BottomBar";
import MobileDrawer from "@/components/MobileDrawer";
import DragContainer from "@/components/DragContainer";
import SplashCanvas from "@/components/SplashCanvas";
import {
  Maximize2, Minimize2, Menu, Camera, CameraOff,
  Dice5, Upload, Image as ImageIcon,
} from "lucide-react";

export default function Home() {
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const [sourceType, setSourceType] = useState<SourceType>("image");
  const [frame, setFrame] = useState<AsciiFrame>([]);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [displayZoom, setDisplayZoom] = useState(1);
  const [mobileToolbarVisible, setMobileToolbarVisible] = useState(true);

  const mainRef = useRef<HTMLDivElement>(null);
  const mobileFileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const { fps, tick } = useFps();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { devices, selectedDeviceId, selectDevice, enumerate } = useMediaDevices();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const {
    depthMapRef, isModelLoading, isModelReady,
    loadProgress, loadStatus, initModel, estimateDepth, clearDepth,
  } = useDepthEstimation();
  const depthFrameCounter = useRef(0);
  const prevZoomRef = useRef(1);

  const samplingCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.createElement("canvas");
  }, []);

  // Animation loop for video/webcam
  const startAnimationLoop = useCallback(
    (source: HTMLVideoElement) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      depthFrameCounter.current = 0;
      const loop = () => {
        if (source.readyState >= 2 && samplingCanvas) {
          // Run depth estimation every 5th frame
          if (settingsRef.current.depthEnabled) {
            depthFrameCounter.current++;
            if (depthFrameCounter.current % 5 === 1) {
              estimateDepth(source);
            }
          }
          const dm = settingsRef.current.depthEnabled ? depthMapRef.current : null;
          const newFrame = convertToAscii(source, settingsRef.current, samplingCanvas, dm);
          setFrame(newFrame);
          tick();
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [samplingCanvas, tick, estimateDepth, depthMapRef]
  );

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // File upload
  const handleFileSelect = useCallback(
    (file: File) => {
      stopAnimationLoop();

      if (file.type.startsWith("image/")) {
        setSourceType("image");
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          imageRef.current = img;
          videoRef.current = null;
          if (settingsRef.current.depthEnabled) {
            estimateDepth(img);
          }
          const dm = settingsRef.current.depthEnabled ? depthMapRef.current : null;
          const newFrame = convertToAscii(img, settingsRef.current, samplingCanvas!, dm);
          setFrame(newFrame);
        };
        img.src = url;
      } else if (file.type.startsWith("video/")) {
        setSourceType("video");
        imageRef.current = null;
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.onloadeddata = () => {
          videoRef.current = video;
          video.play();
          startAnimationLoop(video);
        };
      }
    },
    [samplingCanvas, startAnimationLoop, stopAnimationLoop]
  );

  // Webcam — accepts optional deviceId
  const handleWebcamStart = useCallback(async (deviceId?: string) => {
    try {
      stopAnimationLoop();
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;

      // After first getUserMedia succeeds, labels become available
      enumerate();

      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.onloadedmetadata = () => {
        video.play();
        imageRef.current = null;
        videoRef.current = video;
        setIsWebcamActive(true);
        startAnimationLoop(video);
      };
    } catch {
      // Browser handles permission prompt
    }
  }, [startAnimationLoop, stopAnimationLoop, enumerate]);

  const handleWebcamStop = useCallback(() => {
    stopAnimationLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
    setIsWebcamActive(false);
    setFrame([]);
  }, [stopAnimationLoop]);

  // Source type change
  const handleSourceChange = useCallback(
    (newType: SourceType) => {
      if (newType !== "webcam" && isWebcamActive) {
        handleWebcamStop();
      }
      if (newType !== sourceType) {
        stopAnimationLoop();
        setSourceType(newType);
        if (newType !== "webcam") {
          setFrame([]);
          imageRef.current = null;
          videoRef.current = null;
        }
      }
    },
    [sourceType, isWebcamActive, handleWebcamStop, stopAnimationLoop]
  );

  // Settings change
  const handleSettingsChange = useCallback(
    (newSettings: AsciiSettings) => {
      const depthJustEnabled = newSettings.depthEnabled && !settingsRef.current.depthEnabled;
      const depthJustDisabled = !newSettings.depthEnabled && settingsRef.current.depthEnabled;

      setSettings(newSettings);

      // Init model when depth is first enabled
      if (depthJustEnabled) {
        initModel();
      }

      // Clear depth map when disabled
      if (depthJustDisabled) {
        clearDepth();
      }

      // Re-estimate depth for static images when depth is toggled on
      if (depthJustEnabled && isModelReady && imageRef.current) {
        estimateDepth(imageRef.current);
      }

      if (imageRef.current && samplingCanvas) {
        const dm = newSettings.depthEnabled ? depthMapRef.current : null;
        const newFrame = convertToAscii(imageRef.current, newSettings, samplingCanvas, dm);
        setFrame(newFrame);
      }
    },
    [samplingCanvas, initModel, clearDepth, isModelReady, estimateDepth, depthMapRef]
  );

  // Export
  const handleExport = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ascii-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // Randomize
  const handleRandom = useCallback(() => {
    const styles: ArtStyle[] = ["classic", "particles", "letters", "code", "retro", "terminal"];
    const colors: ColorMode[] = ["grayscale", "color", "matrix", "amber"];
    const fonts: FontOption[] = ["jetbrains", "vt323", "firacode", "courier"];
    const fxs: FxPreset[] = ["none", "noise", "glitch", "crt", "beam", "matrix-rain"];
    const letters: LetterSet[] = ["standard", "mixed", "alphabet", "numbers", "katakana"];

    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

    const newSettings: AsciiSettings = {
      ...settingsRef.current,
      artStyle: pick(styles),
      colorMode: pick(colors),
      font: pick(fonts),
      fxPreset: pick(fxs),
      letterSet: pick(letters),
      ditherStrength: rand(0, 1),
      brightness: rand(-0.3, 0.3),
      contrast: rand(0.6, 1.8),
      fontSize: Math.floor(6 + Math.random() * 14),
      fxStrength: rand(0.2, 0.8),
      matrixScale: rand(0.2, 0.8),
    };
    handleSettingsChange(newSettings);
  }, [handleSettingsChange]);

  // When model becomes ready, estimate depth for current image source
  useEffect(() => {
    if (isModelReady && settings.depthEnabled && imageRef.current) {
      estimateDepth(imageRef.current);
      // Re-render after a short delay to let depth map arrive
      const timer = setTimeout(() => {
        if (imageRef.current && samplingCanvas) {
          const dm = depthMapRef.current;
          const newFrame = convertToAscii(imageRef.current, settingsRef.current, samplingCanvas, dm);
          setFrame(newFrame);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isModelReady, settings.depthEnabled, estimateDepth, samplingCanvas, depthMapRef]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAnimationLoop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopAnimationLoop]);

  // Auto-fit zoom on fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!isFullscreen) {
      // Entering fullscreen — save current zoom, compute auto-fit
      prevZoomRef.current = displayZoom;
      if (frame.length > 0) {
        const cols = frame[0].length;
        const rows = frame.length;
        const charW = settings.fontSize * 0.6;
        const charH = settings.fontSize * 1.1;
        const canvasW = cols * charW;
        const canvasH = rows * charH;
        // In real fullscreen, the entire screen is available
        const availW = screen.width;
        const availH = screen.height;
        const fitZoom = Math.min(availW / canvasW, availH / canvasH, 4);
        setDisplayZoom(Math.round(fitZoom * 10) / 10);
      }
    } else {
      // Exiting fullscreen — restore previous zoom
      setDisplayZoom(prevZoomRef.current);
    }
    toggleFullscreen();
  }, [isFullscreen, displayZoom, frame, settings.fontSize, toggleFullscreen]);

  // Restore zoom when native fullscreen exit occurs (Escape key)
  const wasFullscreenRef = useRef(false);
  useEffect(() => {
    if (wasFullscreenRef.current && !isFullscreen) {
      setDisplayZoom(prevZoomRef.current);
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  // Keyboard shortcuts: R = randomize, F = fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleRandom();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFullscreenToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRandom, handleFullscreenToggle]);

  const hasSource = frame.length > 0;

  // Shared props for ControlContent (used by both sidebar and drawer)
  const controlProps = {
    settings,
    onChange: handleSettingsChange,
    sourceType,
    onSourceChange: handleSourceChange,
    onFileSelect: handleFileSelect,
    onWebcamStart: handleWebcamStart,
    onWebcamStop: handleWebcamStop,
    isWebcamActive,
    onExport: handleExport,
    onRandom: handleRandom,
    devices,
    selectedDeviceId,
    onDeviceSelect: selectDevice,
    displayZoom,
    onZoomChange: setDisplayZoom,
    isDepthLoading: isModelLoading,
    depthLoadProgress: loadProgress,
    depthLoadStatus: loadStatus,
    isDepthReady: isModelReady,
  };

  return (
    <div className="h-screen-safe w-screen flex flex-col bg-black overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <main ref={mainRef} className="flex-1 min-w-0 relative">
          {hasSource ? (
            <DragContainer zoom={displayZoom}>
              <AsciiCanvas frame={frame} settings={settings} />
            </DragContainer>
          ) : (
            <SplashCanvas />
          )}

          {/* Depth model loading overlay */}
          {isModelLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 pointer-events-none">
              <div className="text-center">
                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
                  Loading Depth Model
                </p>
                <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  {loadStatus} {loadProgress > 0 && `${loadProgress}%`}
                </p>
              </div>
            </div>
          )}

          {/* Fullscreen toggle — desktop only */}
          {!isMobile && (
            <button
              onClick={handleFullscreenToggle}
              className="absolute top-3 right-3 z-10 p-2 text-zinc-600 hover:text-zinc-300 bg-black/40 rounded transition-colors"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Mobile: tap canvas to toggle toolbar */}
          {isMobile && hasSource && (
            <button
              onClick={() => setMobileToolbarVisible((v) => !v)}
              className="absolute inset-0 z-[5]"
              aria-label="Toggle toolbar"
            />
          )}
        </main>

        {/* Desktop sidebar — hidden on mobile, slides on fullscreen */}
        <aside
          className={`hidden md:flex border-l border-zinc-800/50 bg-black shrink-0 flex-col overflow-hidden transition-[width] duration-300 ${
            isFullscreen ? "w-0" : "w-[340px]"
          }`}
        >
          <ControlPanel {...controlProps} />
        </aside>
      </div>

      {/* Bottom bar — hidden on mobile and fullscreen */}
      {!isFullscreen && (
        <BottomBar
          fps={fps}
          settings={settings}
          onChange={handleSettingsChange}
          hasSource={hasSource}
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          {...controlProps}
          isMobile
        />
      )}

      {/* Mobile bottom toolbar — glassmorphic iOS 26 style */}
      {isMobile && (
        <div
          className={`fixed bottom-0 inset-x-0 z-30 flex flex-col items-center pb-[env(safe-area-inset-bottom,8px)] pt-3 px-4 transition-transform duration-200 ${
            mobileToolbarVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Icon row */}
          <div className="flex items-center justify-center gap-4">
            {/* Upload */}
            <button
              onClick={() => mobileFileRef.current?.click()}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 active:text-amber-400 active:bg-white/20 transition-all"
              aria-label="Upload"
            >
              <ImageIcon size={20} />
            </button>

            {/* Camera toggle */}
            <button
              onClick={() => {
                if (isWebcamActive) {
                  handleWebcamStop();
                } else {
                  handleSourceChange("webcam");
                  handleWebcamStart(selectedDeviceId || undefined);
                }
              }}
              className={`w-12 h-12 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all ${
                isWebcamActive
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-white/10 text-zinc-400 active:text-amber-400 active:bg-white/20"
              }`}
              aria-label={isWebcamActive ? "Stop camera" : "Start camera"}
            >
              {isWebcamActive ? <CameraOff size={20} /> : <Camera size={20} />}
            </button>

            {/* Randomize */}
            <button
              onClick={handleRandom}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 active:text-amber-400 active:bg-white/20 transition-all"
              aria-label="Randomize"
            >
              <Dice5 size={20} />
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 active:text-amber-400 active:bg-white/20 transition-all"
              aria-label="Export"
            >
              <Upload size={20} />
            </button>

            {/* Menu (opens drawer) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 active:text-amber-400 active:bg-white/20 transition-all"
              aria-label="Settings"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Branding */}
          <a
            href="https://www.alkemist.no"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-[9px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ASCII <span className="font-bold text-zinc-500">ALKEMIST</span>
          </a>

          {/* Hidden file input for mobile upload */}
          <input
            ref={mobileFileRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
