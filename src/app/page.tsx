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
import AsciiCanvas from "@/components/AsciiCanvas";
import ControlPanel from "@/components/ControlPanel";
import BottomBar from "@/components/BottomBar";
import MobileDrawer from "@/components/MobileDrawer";
import DragContainer from "@/components/DragContainer";
import { Maximize2, Minimize2, Menu } from "lucide-react";

export default function Home() {
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const [sourceType, setSourceType] = useState<SourceType>("image");
  const [frame, setFrame] = useState<AsciiFrame>([]);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [displayZoom, setDisplayZoom] = useState(1);

  const mainRef = useRef<HTMLDivElement>(null);
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
  const prevZoomRef = useRef(1);

  const samplingCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.createElement("canvas");
  }, []);

  // Animation loop for video/webcam
  const startAnimationLoop = useCallback(
    (source: HTMLVideoElement) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const loop = () => {
        if (source.readyState >= 2 && samplingCanvas) {
          const newFrame = convertToAscii(source, settingsRef.current, samplingCanvas);
          setFrame(newFrame);
          tick();
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [samplingCanvas, tick]
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
          const newFrame = convertToAscii(img, settingsRef.current, samplingCanvas!);
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
      setSettings(newSettings);
      if (imageRef.current && samplingCanvas) {
        const newFrame = convertToAscii(imageRef.current, newSettings, samplingCanvas);
        setFrame(newFrame);
      }
    },
    [samplingCanvas]
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
            <div className="w-full h-full flex items-center justify-center empty-state">
              <div className="text-center">
                <p className="text-xs text-zinc-600 uppercase tracking-[0.15em]">
                  No Source Loaded
                </p>
                <p className="text-[11px] text-zinc-700 mt-2">
                  Upload an image or video, or start the webcam
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

          {/* Hamburger menu — mobile only */}
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="absolute top-3 right-3 z-10 p-2.5 text-zinc-400 hover:text-zinc-200 bg-black/60 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
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
    </div>
  );
}
