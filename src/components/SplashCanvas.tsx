"use client";

import { useRef, useEffect } from "react";

const MATRIX_CHARS = "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾙﾚﾛﾜﾝ0123456789";
const FONT_SIZE = 14;
const RAIN_SPEED_MIN = 0.15;
const RAIN_SPEED_MAX = 0.6;

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

export default function SplashCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const logoImg = new window.Image();
    let logoMask: Uint8Array | null = null;
    let maskW = 0;
    let maskH = 0;
    let logoLeft = 0;
    let logoRight = 0;
    let logoChars: string[] = [];
    let frameCount = 0;
    // CSS pixel dimensions (not DPR-scaled)
    let cssW = 0;
    let cssH = 0;

    logoImg.onload = () => buildMask();
    logoImg.src = "/logo/alkemist-logo.svg";

    function buildMask() {
      if (!logoImg.complete || !canvas || !ctx) return;
      if (cssW === 0 || cssH === 0) return;

      // Grid based on CSS pixels, not canvas pixels
      maskW = Math.floor(cssW / FONT_SIZE);
      maskH = Math.floor(cssH / FONT_SIZE);
      if (maskW === 0 || maskH === 0) return;

      const offscreen = document.createElement("canvas");
      offscreen.width = maskW;
      offscreen.height = maskH;
      const offCtx = offscreen.getContext("2d")!;

      const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
      // Wider on portrait/mobile screens so the text is legible
      const isPortrait = cssH > cssW;
      const logoScale = isPortrait ? 0.85 : 0.45;
      const targetW = Math.floor(maskW * logoScale);
      const targetH = Math.floor(targetW / logoAspect);
      const ox = Math.floor((maskW - targetW) / 2);
      const oy = Math.floor((maskH - targetH) / 2);
      offCtx.drawImage(logoImg, ox, oy, targetW, targetH);

      const imgData = offCtx.getImageData(0, 0, maskW, maskH);
      logoMask = new Uint8Array(maskW * maskH);

      let minCol = maskW, maxCol = 0;
      for (let i = 0; i < maskW * maskH; i++) {
        logoMask[i] = imgData.data[i * 4 + 3] > 30 ? 1 : 0;
        if (logoMask[i]) {
          const col = i % maskW;
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
      logoLeft = minCol;
      logoRight = maxCol;

      const count = maskW * maskH;
      logoChars = new Array(count);
      for (let i = 0; i < count; i++) {
        logoChars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      }

      initDrops();
    }

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildMask();
    }

    let drops: RainDrop[] = [];

    function initDrops() {
      const cols = Math.floor(cssW / FONT_SIZE);
      drops = [];
      for (let i = 0; i < cols; i++) {
        const inLogoZone = i >= logoLeft - 2 && i <= logoRight + 2;
        const density = inLogoZone ? 0.55 : 0.12;
        if (Math.random() < density) {
          drops.push({
            x: i,
            y: -Math.random() * 50,
            speed: RAIN_SPEED_MIN + Math.random() * (RAIN_SPEED_MAX - RAIN_SPEED_MIN),
            length: 8 + Math.floor(Math.random() * 14),
          });
        }
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      const rows = Math.floor(cssH / FONT_SIZE);

      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.font = `${FONT_SIZE - 2}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";

      frameCount++;

      for (const drop of drops) {
        const col = drop.x;
        const headRow = Math.floor(drop.y);

        for (let t = 0; t < drop.length; t++) {
          const row = headRow - t;
          if (row < 0 || row >= rows) continue;

          const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          const onLogo = logoMask && col >= 0 && col < maskW && row >= 0 && row < maskH
            ? logoMask[row * maskW + col] === 1
            : false;

          if (t === 0) {
            ctx.fillStyle = onLogo ? "#ffffff" : "rgba(0, 255, 65, 0.85)";
          } else if (onLogo) {
            const fade = 1 - (t / drop.length) * 0.4;
            ctx.fillStyle = `rgba(0, 255, 65, ${fade})`;
          } else {
            const fade = 1 - (t / drop.length);
            ctx.fillStyle = `rgba(0, 255, 65, ${fade * 0.3})`;
          }

          ctx.fillText(char, col * FONT_SIZE, row * FONT_SIZE);
        }

        drop.y += drop.speed;

        if (headRow - drop.length > rows) {
          drop.y = -Math.random() * 30;
          drop.speed = RAIN_SPEED_MIN + Math.random() * (RAIN_SPEED_MAX - RAIN_SPEED_MIN);
          drop.length = 8 + Math.floor(Math.random() * 14);
        }
      }

      if (logoMask) {
        if (frameCount % 4 === 0) {
          for (let i = 0; i < maskW * maskH; i++) {
            if (logoMask[i] && Math.random() < 0.25) {
              logoChars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            }
          }
        }

        const highlightSpeed = 0.3;
        const highlightWidth = 6;
        const highlightCenter = (frameCount * highlightSpeed) % (maskW + 40) - 20;

        for (let row = 0; row < maskH; row++) {
          for (let col = 0; col < maskW; col++) {
            const idx = row * maskW + col;
            if (logoMask[idx] !== 1) continue;

            const dist = Math.abs(col - highlightCenter);
            const highlightFactor = Math.max(0, 1 - dist / highlightWidth);
            const baseAlpha = 0.12;
            const alpha = baseAlpha + highlightFactor * 0.5;

            if (highlightFactor > 0.3) {
              const g = Math.round(255 * (0.7 + highlightFactor * 0.3));
              const rb = Math.round(180 * highlightFactor);
              ctx.fillStyle = `rgba(${rb}, ${g}, ${rb}, ${Math.min(1, alpha)})`;
            } else {
              ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
            }

            ctx.fillText(logoChars[idx], col * FONT_SIZE, row * FONT_SIZE);
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ background: "black" }}
    />
  );
}
