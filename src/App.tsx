import { useCallback, useEffect, useRef, useState } from "react";
import LandingScreen from "@/components/LandingScreen";
import Stage from "@/components/Stage";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import { useSettings } from "@/store/settings";

type Phase = "idle" | "running";

export default function App() {
  const tracking = useHandTracking();
  const camera = useCamera();
  const settings = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const v = videoRef.current;
    if (v && camera.stream) {
      v.srcObject = camera.stream;
      v.play().catch(() => {});
    }
  }, [camera.stream]);

  const start = useCallback(async () => {
    try {
      await camera.request();
      setPhase("running");
    } catch {
      /* error surfaced via landing screen */
    }
  }, [camera]);

  const exit = useCallback(() => {
    camera.stop();
    setPhase("idle");
  }, [camera]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-900">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-500"
        style={{
          opacity: phase === "running" && settings.showVideo ? 1 : 0,
        }}
      />

      <div className="scanlines vignette pointer-events-none absolute inset-0 z-[5]" />

      {phase === "running" ? (
        <Stage
          videoRef={videoRef}
          detect={tracking.detect}
          handsDetected={tracking.handsDetected}
          onExit={exit}
        />
      ) : (
        <LandingScreen
          modelStatus={tracking.status}
          modelError={tracking.error}
          cameraStatus={camera.status}
          cameraError={camera.error}
          onStart={start}
        />
      )}
    </div>
  );
}
