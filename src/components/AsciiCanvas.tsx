"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { AsciiFrame, AsciiSettings, FxPreset } from "@/types";
import { FONT_FAMILIES, MATRIX_CHARS } from "@/lib/constants";
import { MatrixRain } from "@/lib/matrix-rain";

interface AsciiCanvasProps {
  frame: AsciiFrame;
  settings: AsciiSettings;
  onMousePos?: (pos: { x: number; y: number } | null) => void;
}

// Shared FX state that persists across renders
let glitchSeed = 0;
let beamY = 0;

export default function AsciiCanvas({ frame, settings, onMousePos }: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matrixRain = useRef<MatrixRain>(new MatrixRain());
  const mousePos = useRef<{ x: number; y: number } | null>(null);
  const [, forceRender] = useState(0);

  // Motion detection for matrix mode
  const prevBrightness = useRef<Float32Array | null>(null);
  const motionMap = useRef<Float32Array | null>(null);

  // Track mouse over canvas
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mousePos.current = null;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || frame.length === 0) return;

    const { fontSize, colorMode, font, fxPreset, fxStrength, hoverStrength, matrixScale } = settings;
    const charWidth = fontSize * 0.6;
    const charHeight = fontSize * 1.1;
    const fontFamily = FONT_FAMILIES[font];

    const cols = frame[0].length;
    const rows = frame.length;

    const w = Math.ceil(cols * charWidth);
    const h = Math.ceil(rows * charHeight);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "top";

    // Advance FX state
    glitchSeed = (glitchSeed + 1) % 1000;
    beamY = (beamY + 2) % (rows + 20);

    // Matrix rain
    const isMatrixRain = fxPreset === "matrix-rain" || colorMode === "matrix";
    if (isMatrixRain) {
      matrixRain.current.resize(cols, rows);
      matrixRain.current.tick(matrixScale);
    }

    // ── Motion detection for matrix mode ──
    const totalCells = cols * rows;
    if (isMatrixRain) {
      if (!motionMap.current || motionMap.current.length !== totalCells) {
        motionMap.current = new Float32Array(totalCells);
        prevBrightness.current = new Float32Array(totalCells);
        // Initialize prev brightness from current frame
        for (let i = 0; i < totalCells; i++) {
          const fy = Math.floor(i / cols);
          const fx = i % cols;
          const cell = frame[fy][fx];
          prevBrightness.current[i] = colorMode === "color"
            ? (0.299 * cell.r + 0.587 * cell.g + 0.114 * cell.b) / 255
            : cell.r / 255;
        }
      }

      const prev = prevBrightness.current!;
      const motion = motionMap.current!;

      for (let i = 0; i < totalCells; i++) {
        const fy = Math.floor(i / cols);
        const fx = i % cols;
        const cell = frame[fy][fx];
        const curLum = colorMode === "color"
          ? (0.299 * cell.r + 0.587 * cell.g + 0.114 * cell.b) / 255
          : cell.r / 255;

        const delta = Math.abs(curLum - prev[i]);
        // Accumulate with temporal decay — motion fades over ~10 frames
        motion[i] = motion[i] * 0.85 + delta * 4.0;
        // Clamp to 0-1
        if (motion[i] > 1) motion[i] = 1;

        prev[i] = curLum;
      }
    }

    // Mouse position in grid coordinates
    const mp = mousePos.current;
    const mpGridX = mp ? mp.x / charWidth : -9999;
    const mpGridY = mp ? mp.y / charHeight : -9999;
    const hoverRadius = hoverStrength;

    let lastColor = "";

    for (let y = 0; y < rows; y++) {
      // Glitch: horizontal offset for some rows
      let glitchOffsetX = 0;
      if (fxPreset === "glitch" && fxStrength > 0) {
        const hash = Math.sin(y * 127.1 + glitchSeed * 43.7) * 43758.5453;
        const r = hash - Math.floor(hash);
        if (r > 1 - fxStrength * 0.15) {
          glitchOffsetX = (r - 0.5) * 40 * fxStrength;
        }
      }

      for (let x = 0; x < cols; x++) {
        const cell = frame[y][x];
        let char = cell.char;
        let cr = cell.r, cg = cell.g, cb = cell.b;

        // ── Hover dispersal ──
        if (hoverRadius > 0 && mp) {
          const dx = x - mpGridX;
          const dy = y - mpGridY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < hoverRadius) {
            const intensity = 1 - dist / hoverRadius;
            // Replace char with random one
            if (Math.random() < intensity * 0.8) {
              const randChars = "ｦｱｲｳｴｵｶ.·:;*+=-~<>{}[]|/\\!@#$%^&";
              char = randChars[Math.floor(Math.random() * randChars.length)];
            }
            // Brighten near cursor
            const boost = intensity * 0.5;
            cr = Math.min(255, cr + Math.round(boost * 150));
            cg = Math.min(255, cg + Math.round(boost * 150));
            cb = Math.min(255, cb + Math.round(boost * 150));
          }
        }

        // ── Matrix rain overlay ──
        // The source image is ALWAYS visible as green ASCII.
        // Rain columns are animated highlights on top.
        // Motion-detected areas get boosted brightness.
        if (isMatrixRain) {
          // cell.r carries raw brightness (0-255) for matrix/amber modes
          // (encoded in ascii.ts). For full-color mode fallback to luminance.
          const sourceLum = colorMode === "color"
            ? (0.299 * cell.r + 0.587 * cell.g + 0.114 * cell.b) / 255
            : cell.r / 255;

          // Motion energy at this cell (0-1)
          const motionEnergy = motionMap.current
            ? motionMap.current[y * cols + x]
            : 0;

          // Apply squared contrast so bright/dark separation is much stronger
          const boostedLum = sourceLum * sourceLum;

          // Base green: image is clearly visible
          cr = 0;
          cg = Math.round(boostedLum * 255);
          cb = Math.round(boostedLum * 25);

          // Motion boost: moving areas glow brighter, shifting green → white
          if (motionEnergy > 0.05) {
            const mBoost = motionEnergy * motionEnergy; // squared for sharper edges

            // Low motion: brighter green. High motion: shifts toward white.
            // whiteness ramps from 0 at motionEnergy=0.3 to 1 at motionEnergy=1.0
            const whiteness = Math.max(0, (motionEnergy - 0.3) / 0.7);
            const w2 = whiteness * whiteness; // smooth ramp

            // Green channel always boosted
            cg = Math.min(255, cg + Math.round(mBoost * 220));
            // R and B channels ramp toward white at high motion
            cr = Math.min(255, cr + Math.round(mBoost * 80 + w2 * 175));
            cb = Math.min(255, cb + Math.round(mBoost * 40 + w2 * 140));

            // High motion: swap to katakana for visual disruption
            if (motionEnergy > 0.3 && Math.random() < motionEnergy * 0.6) {
              char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            }

            // Peak motion: near-white flash (like rain head but for movement)
            if (motionEnergy > 0.7) {
              const flash = (motionEnergy - 0.7) / 0.3; // 0→1
              cr = Math.min(255, cr + Math.round(flash * 80));
              cg = 255;
              cb = Math.min(255, cb + Math.round(flash * 60));
            }
          }

          // Very dark areas: suppress character entirely (unless motion)
          if (sourceLum < 0.06 && motionEnergy < 0.1) {
            char = " ";
          }

          // Rain overlay: only rain columns replace characters with katakana
          const rain = matrixRain.current.getRain(x, y);
          if (rain) {
            char = rain.char;
            if (rain.intensity > 0.9) {
              // Head: bright white-green flash
              cr = 220;
              cg = 255;
              cb = 220;
            } else {
              // Trail: add green brightness on top of source base
              const boost = rain.intensity;
              // In bright areas or moving areas, rain is more visible
              const srcBoost = 0.3 + sourceLum * 0.7 + motionEnergy * 0.5;
              cg = Math.min(255, cg + Math.round(boost * srcBoost * 200));
              cr = Math.min(80, cr + Math.round(boost * srcBoost * 40));
              cb = Math.min(80, cb + Math.round(boost * srcBoost * 40));
            }
          }
        }

        // ── Noise FX ──
        if (fxPreset === "noise" && fxStrength > 0) {
          if (Math.random() < fxStrength * 0.1) {
            char = " .·:;=-+*#%@"[Math.floor(Math.random() * 12)];
            const noiseVal = Math.floor(Math.random() * 80);
            cr = noiseVal; cg = noiseVal; cb = noiseVal;
          }
        }

        // ── Intervals FX ──
        if (fxPreset === "intervals" && fxStrength > 0) {
          const bandSize = Math.max(2, Math.round(8 - fxStrength * 5));
          if (y % (bandSize * 2) >= bandSize) {
            char = " ";
            cr = 0; cg = 0; cb = 0;
          }
        }

        // ── Beam Sweep FX ──
        if (fxPreset === "beam" && fxStrength > 0) {
          const beamDist = Math.abs(y - beamY);
          if (beamDist < 4) {
            const boost = (1 - beamDist / 4) * fxStrength;
            cr = Math.min(255, cr + Math.round(boost * 200));
            cg = Math.min(255, cg + Math.round(boost * 200));
            cb = Math.min(255, cb + Math.round(boost * 200));
          }
        }

        if (char === " " && !isMatrixRain) continue;
        if (char === " ") continue;

        const color = `rgb(${cr},${cg},${cb})`;
        if (color !== lastColor) {
          ctx.fillStyle = color;
          lastColor = color;
        }

        ctx.fillText(char, x * charWidth + glitchOffsetX, y * charHeight);
      }
    }

    // ── CRT Monitor FX ──
    if (fxPreset === "crt" && fxStrength > 0) {
      // Scanlines
      ctx.fillStyle = `rgba(0,0,0,${0.15 * fxStrength})`;
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1);
      }
      // Vignette
      const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${0.6 * fxStrength})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Glow for matrix/amber modes
    if ((colorMode === "matrix" || colorMode === "amber") && !isMatrixRain) {
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = "blur(2px)";
      ctx.globalAlpha = 0.12;
      ctx.drawImage(canvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }

    // Extra glow pass for matrix rain
    if (isMatrixRain) {
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = "blur(3px)";
      ctx.globalAlpha = 0.1;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = "blur(6px)";
      ctx.globalAlpha = 0.05;
      ctx.drawImage(canvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }
  }, [frame, settings]);

  // Render loop — requestAnimationFrame for animated FX
  useEffect(() => {
    let rafId = 0;
    const hasAnimatedFx =
      settings.fxPreset === "glitch" ||
      settings.fxPreset === "beam" ||
      settings.fxPreset === "matrix-rain" ||
      settings.colorMode === "matrix" ||
      settings.hoverStrength > 0;

    if (hasAnimatedFx && frame.length > 0) {
      const loop = () => {
        render();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    } else {
      render();
    }
  }, [render, settings.fxPreset, settings.colorMode, settings.hoverStrength, frame]);

  if (frame.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full object-contain"
      style={{ imageRendering: "auto" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}
