"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface DepthMap {
  data: Float32Array;
  width: number;
  height: number;
}

export function useDepthEstimation() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const depthMapRef = useRef<DepthMap | null>(null);
  const pendingRef = useRef(false);
  const canvasRef = useRef<OffscreenCanvas | null>(null);

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL("../workers/depth-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      const { type } = e.data;

      if (type === "progress") {
        setLoadProgress(e.data.progress);
        setLoadStatus(e.data.status);
      } else if (type === "ready") {
        setIsModelLoading(false);
        setIsModelReady(true);
        setLoadProgress(100);
        setLoadStatus("Ready");
      } else if (type === "depth") {
        depthMapRef.current = {
          data: e.data.depthMap,
          width: e.data.width,
          height: e.data.height,
        };
        pendingRef.current = false;
      } else if (type === "error") {
        console.error("Depth worker error:", e.data.error);
        pendingRef.current = false;
        setIsModelLoading(false);
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const initModel = useCallback(() => {
    if (isModelReady || isModelLoading) return;
    setIsModelLoading(true);
    setLoadProgress(0);
    const worker = getWorker();
    worker.postMessage({ type: "init" });
  }, [isModelReady, isModelLoading, getWorker]);

  const estimateDepth = useCallback(
    (source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement) => {
      if (!isModelReady || pendingRef.current) return;

      // Get source dimensions
      let sw: number, sh: number;
      if (source instanceof HTMLVideoElement) {
        sw = source.videoWidth;
        sh = source.videoHeight;
      } else if (source instanceof HTMLImageElement) {
        sw = source.naturalWidth;
        sh = source.naturalHeight;
      } else {
        sw = source.width;
        sh = source.height;
      }

      if (sw === 0 || sh === 0) return;

      // Scale down for faster inference — 384px on the long side
      const scale = Math.min(1, 384 / Math.max(sw, sh));
      const w = Math.round(sw * scale);
      const h = Math.round(sh * scale);

      // Reuse offscreen canvas
      if (!canvasRef.current || canvasRef.current.width !== w || canvasRef.current.height !== h) {
        canvasRef.current = new OffscreenCanvas(w, h);
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(source, 0, 0, w, h);
      const bitmap = canvasRef.current.transferToImageBitmap();

      pendingRef.current = true;
      workerRef.current?.postMessage(
        { type: "estimate", bitmap, width: w, height: h },
        [bitmap]
      );
    },
    [isModelReady]
  );

  const clearDepth = useCallback(() => {
    depthMapRef.current = null;
  }, []);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    depthMapRef,
    isModelLoading,
    isModelReady,
    loadProgress,
    loadStatus,
    initModel,
    estimateDepth,
    clearDepth,
  };
}
