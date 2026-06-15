import { useCallback, useEffect, useRef, useState } from "react";

type CameraStatus = "idle" | "requesting" | "ready" | "error";

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const request = useCallback(async () => {
    setStatus("requesting");
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("当前浏览器不支持摄像头访问");
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setStatus("ready");
      return s;
    } catch (e) {
      const err = e as DOMException;
      let msg = "无法访问摄像头";
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        msg = "摄像头权限被拒绝，请在浏览器设置中允许后重试";
      } else if (err.name === "NotFoundError") {
        msg = "未检测到摄像头设备";
      } else if (err.name === "NotReadableError") {
        msg = "摄像头被其他程序占用";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setStatus("error");
      throw e;
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { stream, status, error, request, stop };
}
