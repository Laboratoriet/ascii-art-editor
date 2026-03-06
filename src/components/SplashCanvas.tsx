"use client";

import { useRef, useEffect } from "react";

const MATRIX_CHARS = "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾙﾚﾛﾜﾝ0123456789";
const FONT_SIZE = 14;
const RAIN_SPEED_MIN = 0.3;
const RAIN_SPEED_MAX = 1.2;
const COLUMN_DENSITY = 0.4; // fraction of columns active

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

    logoImg.onload = () => {
      // We'll build the mask once we know canvas size
      buildMask();
    };
    logoImg.src = "/logo/alkemist-logo.svg";

    function buildMask() {
      if (!logoImg.complete || !canvas || !ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Compute cols/rows in character grid
      maskW = Math.floor(cw / FONT_SIZE);
      maskH = Math.floor(ch / FONT_SIZE);

      if (maskW === 0 || maskH === 0) return;

      // Render logo centered into an offscreen canvas at grid resolution
      const offscreen = document.createElement("canvas");
      offscreen.width = maskW;
      offscreen.height = maskH;
      const offCtx = offscreen.getContext("2d")!;

      // Scale logo to fit ~60% of canvas width, centered
      const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
      const targetW = Math.floor(maskW * 0.6);
      const targetH = Math.floor(targetW / logoAspect);
      const ox = Math.floor((maskW - targetW) / 2);
      const oy = Math.floor((maskH - targetH) / 2);

      offCtx.drawImage(logoImg, ox, oy, targetW, targetH);

      const imgData = offCtx.getImageData(0, 0, maskW, maskH);
      logoMask = new Uint8Array(maskW * maskH);

      for (let i = 0; i < maskW * maskH; i++) {
        // Use alpha channel (white on transparent SVG)
        const a = imgData.data[i * 4 + 3];
        logoMask[i] = a > 30 ? 1 : 0;
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
      initDrops();
    }

    // Rain drops
    let drops: RainDrop[] = [];

    function initDrops() {
      if (!canvas) return;
      const cols = Math.floor(canvas.getBoundingClientRect().width / FONT_SIZE);
      drops = [];
      for (let i = 0; i < cols; i++) {
        if (Math.random() < COLUMN_DENSITY) {
          drops.push({
            x: i,
            y: -Math.random() * 40, // stagger start positions
            speed: RAIN_SPEED_MIN + Math.random() * (RAIN_SPEED_MAX - RAIN_SPEED_MIN),
            length: 8 + Math.floor(Math.random() * 16),
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
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE - 2}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";

      for (const drop of drops) {
        const col = drop.x;
        const headRow = Math.floor(drop.y);

        // Draw the trail
        for (let t = 0; t < drop.length; t++) {
          const row = headRow - t;
          if (row < 0 || row >= rows) continue;

          const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

          // Check if this cell overlaps the logo
          const onLogo = logoMask && col < maskW && row < maskH && col >= 0 && row >= 0
            ? logoMask[row * maskW + col] === 1
            : false;

          if (t === 0) {
            // Head of the drop — brightest
            ctx.fillStyle = onLogo ? "#ffffff" : "rgba(0, 255, 65, 0.9)";
          } else if (onLogo) {
            // Over logo — glow brighter green
            const fade = 1 - (t / drop.length) * 0.5;
            ctx.fillStyle = `rgba(0, 255, 65, ${fade})`;
          } else {
            // Normal trail — fading
            const fade = 1 - (t / drop.length);
            ctx.fillStyle = `rgba(0, 255, 65, ${fade * 0.35})`;
          }

          ctx.fillText(char, col * FONT_SIZE, row * FONT_SIZE);
        }

        // Advance
        drop.y += drop.speed;

        // Reset when fully off screen
        if (headRow - drop.length > rows) {
          drop.y = -Math.random() * 20;
          drop.speed = RAIN_SPEED_MIN + Math.random() * (RAIN_SPEED_MAX - RAIN_SPEED_MIN);
          drop.length = 8 + Math.floor(Math.random() * 16);
        }
      }

      // Draw persistent logo glow (very subtle static outline)
      if (logoMask) {
        ctx.font = `${FONT_SIZE - 2}px "JetBrains Mono", monospace`;
        for (let row = 0; row < maskH; row++) {
          for (let col = 0; col < maskW; col++) {
            if (logoMask[row * maskW + col] === 1) {
              // Very dim static glow so logo shape is always faintly visible
              ctx.fillStyle = "rgba(0, 255, 65, 0.06)";
              const char = MATRIX_CHARS[(row * maskW + col) % MATRIX_CHARS.length];
              ctx.fillText(char, col * FONT_SIZE, row * FONT_SIZE);
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
