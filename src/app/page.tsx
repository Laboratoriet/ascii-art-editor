"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  AsciiFrame, AsciiSettings, SourceType, ArtStyle,
  ColorMode, FxPreset, FontOption, LetterSet,
} from "@/types";
import { DEFAULT_SETTINGS, STYLE_PRESETS } from "@/lib/constants";
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
  Shuffle, Upload, Image as ImageIcon, SwitchCamera,
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

  // Logo canvas for splash/demo mode
  const logoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasRealSource = useRef(false);
  // Show SplashCanvas until user interacts with settings
  const [splashActive, setSplashActive] = useState(true);

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

  // Load logo SVG and render to an offscreen canvas for splash/demo mode
  useEffect(() => {
    const logoImg = new window.Image();
    logoImg.onload = () => {
      // Render logo white-on-black at a reasonable resolution
      const logoCanvas = document.createElement("canvas");
      const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
      // Use a width that gives decent ASCII columns (~120-160 cols at default font)
      const w = 800;
      const h = Math.round(w / aspect);
      // Add padding around logo
      const padX = Math.round(w * 0.15);
      const padY = Math.round(h * 1.2);
      logoCanvas.width = w + padX * 2;
      logoCanvas.height = h + padY * 2;
      const ctx = logoCanvas.getContext("2d")!;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
      ctx.drawImage(logoImg, padX, padY, w, h);
      logoCanvasRef.current = logoCanvas;

      // Generate initial splash frame if no real source yet
      if (!hasRealSource.current && samplingCanvas) {
        const splashFrame = convertToAscii(logoCanvas, settingsRef.current, samplingCanvas);
        setFrame(splashFrame);
      }
    };
    logoImg.src = "/logo/alkemist-logo.svg";
  }, [samplingCanvas]);

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
        setSplashActive(false);
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          imageRef.current = img;
          hasRealSource.current = true;
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
        setSplashActive(false);
        imageRef.current = null;
        hasRealSource.current = true;
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

  // Webcam — accepts optional deviceId and resolution
  const handleWebcamStart = useCallback(async (deviceId?: string, hd?: boolean) => {
    try {
      setSplashActive(false);
      stopAnimationLoop();
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const idealW = hd ? 1920 : 1280;
      const idealH = hd ? 1080 : 720;
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: idealW }, height: { ideal: idealH } }
        : { facingMode: "user", width: { ideal: idealW }, height: { ideal: idealH } };

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
        hasRealSource.current = true;
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
    hasRealSource.current = false;
    setIsWebcamActive(false);
    // Show logo with current settings instead of blank
    if (logoCanvasRef.current && samplingCanvas) {
      const logoFrame = convertToAscii(logoCanvasRef.current, settingsRef.current, samplingCanvas);
      setFrame(logoFrame);
    } else {
      setFrame([]);
    }
  }, [stopAnimationLoop, samplingCanvas]);

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
          imageRef.current = null;
          videoRef.current = null;
          hasRealSource.current = false;
          // Show logo with current settings
          if (logoCanvasRef.current && samplingCanvas) {
            const logoFrame = convertToAscii(logoCanvasRef.current, settingsRef.current, samplingCanvas);
            setFrame(logoFrame);
          } else {
            setFrame([]);
          }
        }
      }
    },
    [sourceType, isWebcamActive, handleWebcamStop, stopAnimationLoop, samplingCanvas]
  );

  // Settings change
  const handleSettingsChange = useCallback(
    (newSettings: AsciiSettings) => {
      // In logo demo mode: if art style changed, apply curated preset
      // so each style looks visually distinct
      let effective = newSettings;
      if (!hasRealSource.current && newSettings.artStyle !== settingsRef.current.artStyle) {
        const preset = STYLE_PRESETS[newSettings.artStyle];
        effective = { ...newSettings, ...preset, artStyle: newSettings.artStyle };
      }

      const depthJustEnabled = effective.depthEnabled && !settingsRef.current.depthEnabled;
      const depthJustDisabled = !effective.depthEnabled && settingsRef.current.depthEnabled;

      // Dismiss splash on first settings interaction — switch to logo-fed AsciiCanvas
      setSplashActive(false);

      setSettings(effective);

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
        const dm = effective.depthEnabled ? depthMapRef.current : null;
        const newFrame = convertToAscii(imageRef.current, effective, samplingCanvas, dm);
        setFrame(newFrame);
      } else if (!hasRealSource.current && logoCanvasRef.current && samplingCanvas) {
        // Re-render logo splash with new settings
        const newFrame = convertToAscii(logoCanvasRef.current, effective, samplingCanvas);
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

    // Restart webcam at higher/lower resolution
    if (isWebcamActive) {
      const enteringFullscreen = !isFullscreen;
      handleWebcamStart(selectedDeviceId || undefined, enteringFullscreen);
    }
  }, [isFullscreen, displayZoom, frame, settings.fontSize, toggleFullscreen, isWebcamActive, handleWebcamStart, selectedDeviceId]);

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
          {splashActive && !hasRealSource.current ? (
            <SplashCanvas />
          ) : hasSource ? (
            <DragContainer zoom={displayZoom}>
              <AsciiCanvas frame={frame} settings={settings} disableMatrixRain={!hasRealSource.current} />
            </DragContainer>
          ) : null}

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
          {isMobile && (
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

            {/* Camera: tap = start/switch, long press = stop */}
            <button
              onClick={() => {
                if (!isWebcamActive) {
                  handleSourceChange("webcam");
                  handleWebcamStart(selectedDeviceId || undefined);
                } else if (devices.length > 1) {
                  // Cycle to next camera
                  const currentIdx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
                  const nextIdx = (currentIdx + 1) % devices.length;
                  const nextId = devices[nextIdx].deviceId;
                  selectDevice(nextId);
                  handleWebcamStart(nextId);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isWebcamActive) handleWebcamStop();
              }}
              onTouchStart={(e) => {
                const timer = setTimeout(() => {
                  if (isWebcamActive) handleWebcamStop();
                }, 500);
                (e.currentTarget as HTMLButtonElement).dataset.longPress = String(timer);
              }}
              onTouchEnd={(e) => {
                const timer = (e.currentTarget as HTMLButtonElement).dataset.longPress;
                if (timer) clearTimeout(Number(timer));
              }}
              className={`w-12 h-12 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all ${
                isWebcamActive
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-white/10 text-zinc-400 active:text-amber-400 active:bg-white/20"
              }`}
              aria-label={isWebcamActive ? "Switch camera (hold to stop)" : "Start camera"}
            >
              {isWebcamActive ? <SwitchCamera size={20} /> : <Camera size={20} />}
            </button>

            {/* Randomize */}
            <button
              onClick={handleRandom}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 active:text-amber-400 active:bg-white/20 transition-all"
              aria-label="Randomize"
            >
              <Shuffle size={20} />
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
            className="mt-3 text-[9px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <span className="font-bold text-zinc-500">ALKEMIST</span> ASCII Dither System
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
