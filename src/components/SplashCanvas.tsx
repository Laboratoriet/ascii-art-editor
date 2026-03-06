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

    // Load logo to create brightness mask
    const logoImg = new window.Image();
    let logoMask: Uint8Array | null = null;
    let maskW = 0;
    let maskH = 0;
    // Logo bounds in grid coords for biasing rain
    let logoLeft = 0;
    let logoRight = 0;
    // Random flicker chars for the logo (refreshed periodically)
    let logoChars: string[] = [];
    let flickerTimer = 0;

    logoImg.onload = () => {
      buildMask();
    };
    logoImg.src = "/logo/alkemist-logo.svg";

    function buildMask() {
      if (!logoImg.complete || !canvas || !ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      maskW = Math.floor(cw / FONT_SIZE);
      maskH = Math.floor(ch / FONT_SIZE);

      if (maskW === 0 || maskH === 0) return;

      const offscreen = document.createElement("canvas");
      offscreen.width = maskW;
      offscreen.height = maskH;
      const offCtx = offscreen.getContext("2d")!;

      // Logo at 45% of canvas width — smaller, more breathing room
      const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
      const targetW = Math.floor(maskW * 0.45);
      const targetH = Math.floor(targetW / logoAspect);
      const ox = Math.floor((maskW - targetW) / 2);
      const oy = Math.floor((maskH - targetH) / 2);

      offCtx.drawImage(logoImg, ox, oy, targetW, targetH);

      const imgData = offCtx.getImageData(0, 0, maskW, maskH);
      logoMask = new Uint8Array(maskW * maskH);

      let minCol = maskW, maxCol = 0;
      for (let i = 0; i < maskW * maskH; i++) {
        const a = imgData.data[i * 4 + 3];
        logoMask[i] = a > 30 ? 1 : 0;
        if (logoMask[i]) {
          const col = i % maskW;
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
      logoLeft = minCol;
      logoRight = maxCol;

      // Init random chars for logo cells
      const count = maskW * maskH;
      logoChars = new Array(count);
      for (let i = 0; i < count; i++) {
        logoChars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      }

      initDrops();
    }

    function refreshLogoChars() {
      // Randomly change ~10% of logo characters for flicker effect
      if (!logoMask) return;
      const count = maskW * maskH;
      for (let i = 0; i < count; i++) {
        if (logoMask[i] && Math.random() < 0.1) {
          logoChars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }
      }
    }

    // Resize handler
    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildMask();
    }

    // Rain drops — biased toward logo columns
    let drops: RainDrop[] = [];

    function initDrops() {
      if (!canvas) return;
      const cols = Math.floor(canvas.getBoundingClientRect().width / FONT_SIZE);
      drops = [];

      for (let i = 0; i < cols; i++) {
        // Higher density over logo area, sparse on sides
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

    // Animation
    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const rows = Math.floor(h / FONT_SIZE);

      // Fade previous frame
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE - 2}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";

      // Draw rain
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

        // Advance
        drop.y += drop.speed;

        // Reset when fully off screen
        if (headRow - drop.length > rows) {
          drop.y = -Math.random() * 30;
          drop.speed = RAIN_SPEED_MIN + Math.random() * (RAIN_SPEED_MAX - RAIN_SPEED_MIN);
          drop.length = 8 + Math.floor(Math.random() * 14);
        }
      }

      // Draw persistent logo glow with flickering characters
      if (logoMask) {
        // Refresh some logo chars every ~8 frames
        flickerTimer++;
        if (flickerTimer % 8 === 0) {
          refreshLogoChars();
        }

        for (let row = 0; row < maskH; row++) {
          for (let col = 0; col < maskW; col++) {
            const idx = row * maskW + col;
            if (logoMask[idx] === 1) {
              // Stronger static glow so the logo reads clearly
              ctx.fillStyle = "rgba(0, 255, 65, 0.12)";
              ctx.fillText(logoChars[idx], col * FONT_SIZE, row * FONT_SIZE);
            }
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
