"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  AsciiFrame, AsciiSettings, SourceType, ArtStyle,
  ColorMode, FxPreset, FontOption, LetterSet,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { convertToAscii } from "@/lib/ascii";
import { useFps } from "@/hooks/useFps";
import AsciiCanvas from "@/components/AsciiCanvas";
import ControlPanel from "@/components/ControlPanel";
import BottomBar from "@/components/BottomBar";
import DragContainer from "@/components/DragContainer";

export default function Home() {
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const [sourceType, setSourceType] = useState<SourceType>("image");
  const [frame, setFrame] = useState<AsciiFrame>([]);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const { fps, tick } = useFps();

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

  // Webcam
  const handleWebcamStart = useCallback(async () => {
    try {
      stopAnimationLoop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
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
  }, [startAnimationLoop, stopAnimationLoop]);

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

  const hasSource = frame.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <main className="flex-1 min-w-0 relative">
          {hasSource ? (
            <DragContainer>
              <AsciiCanvas frame={frame} settings={settings} />
            </DragContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center empty-state">
              <div className="text-center">
                <p className="text-[11px] text-zinc-600 uppercase tracking-[0.2em]">
                  No Source Loaded
                </p>
                <p className="text-[10px] text-zinc-700 mt-2">
                  Upload an image or video, or start the webcam
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="w-[340px] border-l border-zinc-800/50 bg-black shrink-0 flex flex-col">
          <ControlPanel
            settings={settings}
            onChange={handleSettingsChange}
            sourceType={sourceType}
            onSourceChange={handleSourceChange}
            onFileSelect={handleFileSelect}
            onWebcamStart={handleWebcamStart}
            onWebcamStop={handleWebcamStop}
            isWebcamActive={isWebcamActive}
            onExport={handleExport}
            onRandom={handleRandom}
          />
        </aside>
      </div>

      <BottomBar
        fps={fps}
        settings={settings}
        onChange={handleSettingsChange}
        hasSource={hasSource}
      />
    </div>
  );
}
