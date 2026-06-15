import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export interface NormalizedPoint {
  x: number;
  y: number;
}
export interface HandFrame {
  active: boolean;
  points: NormalizedPoint[];
}
export interface TrackingFrame {
  hands: HandFrame[];
}

const NUM_HANDS = 2;
const LANDMARKS = 21;
const SMOOTH = 0.5;

type Status = "loading" | "ready" | "error";

function emptyPoints(): NormalizedPoint[] {
  return Array.from({ length: LANDMARKS }, () => ({ x: 0.5, y: 0.5 }));
}

export function useHandTracking() {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const slotsRef = useRef<HandFrame[]>(
    Array.from({ length: NUM_HANDS }, () => ({
      active: false,
      points: emptyPoints(),
    })),
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: NUM_HANDS,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(
          (e as Error)?.message ?? "手部识别模型加载失败，请检查网络连接",
        );
        setStatus("error");
      }
    }
    init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  const detect = useCallback(
    (video: HTMLVideoElement, timestampMs: number): TrackingFrame => {
      const landmarker = landmarkerRef.current;
      const slots = slotsRef.current;
      let result: HandLandmarkerResult | undefined;
      if (landmarker && video.readyState >= 2) {
        try {
          result = landmarker.detectForVideo(video, timestampMs);
        } catch {
          result = undefined;
        }
      }
      const detected = result?.landmarks ?? [];

      for (let h = 0; h < NUM_HANDS; h++) {
        const slot = slots[h];
        const raw = detected[h];
        if (raw) {
          if (!slot.active) {
            for (let i = 0; i < LANDMARKS; i++) {
              slot.points[i].x = 1 - raw[i].x;
              slot.points[i].y = raw[i].y;
            }
          } else {
            for (let i = 0; i < LANDMARKS; i++) {
              const tx = 1 - raw[i].x;
              const ty = raw[i].y;
              slot.points[i].x += (tx - slot.points[i].x) * SMOOTH;
              slot.points[i].y += (ty - slot.points[i].y) * SMOOTH;
            }
          }
          slot.active = true;
        } else {
          slot.active = false;
        }
      }
      return {
        hands: slots.map((s) => ({
          active: s.active,
          points: s.points.map((p) => ({ x: p.x, y: p.y })),
        })),
      };
    },
    [],
  );

  const handsDetected = useCallback(() => {
    return slotsRef.current.filter((s) => s.active).length;
  }, []);

  return { status, error, detect, handsDetected };
}
