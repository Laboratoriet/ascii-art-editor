/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, env } from "@huggingface/transformers";

// Disable local model loading — always fetch from HF Hub
env.allowLocalModels = false;

let depthPipeline: any = null;

type MessageData =
  | { type: "init" }
  | { type: "estimate"; bitmap: ImageBitmap; width: number; height: number };

async function loadModel(device: "webgpu" | "wasm") {
  return (pipeline as any)("depth-estimation", "onnx-community/depth-anything-v2-small", {
    dtype: "q4f16",
    device,
    progress_callback: (progress: { progress?: number; status?: string }) => {
      if (typeof progress.progress === "number") {
        self.postMessage({
          type: "progress",
          progress: Math.round(progress.progress),
          status: progress.status || "Downloading...",
        });
      }
    },
  });
}

self.onmessage = async (e: MessageEvent<MessageData>) => {
  const { type } = e.data;

  if (type === "init") {
    try {
      self.postMessage({ type: "progress", progress: 0, status: "Loading depth model..." });

      const hasWebGPU = "gpu" in navigator;
      try {
        depthPipeline = await loadModel(hasWebGPU ? "webgpu" : "wasm");
      } catch {
        // Retry with WASM if WebGPU failed
        if (hasWebGPU) {
          depthPipeline = await loadModel("wasm");
        } else {
          throw new Error("Failed to load model");
        }
      }

      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", error: String(err) });
    }
  }

  if (type === "estimate") {
    if (!depthPipeline) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }

    try {
      const { bitmap, width, height } = e.data;

      // Draw bitmap to offscreen canvas to create a blob
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });

      // Run inference
      const result = await depthPipeline(blob);

      // Extract depth data from the result
      const depthResult = Array.isArray(result) ? result[0] : result;
      const depthTensor = depthResult.depth;
      const depthData = depthTensor.data as Float32Array;
      const depthW = depthTensor.width as number;
      const depthH = depthTensor.height as number;

      // Normalize to 0-1 range
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < depthData.length; i++) {
        if (depthData[i] < min) min = depthData[i];
        if (depthData[i] > max) max = depthData[i];
      }

      const range = max - min || 1;
      const normalized = new Float32Array(depthData.length);
      for (let i = 0; i < depthData.length; i++) {
        normalized[i] = (depthData[i] - min) / range;
      }

      self.postMessage(
        { type: "depth", depthMap: normalized, width: depthW, height: depthH },
        { transfer: [normalized.buffer] }
      );
    } catch (err) {
      self.postMessage({ type: "error", error: String(err) });
    }
  }
};
