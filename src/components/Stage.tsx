import { useEffect, useRef, useState } from "react";
import { Activity, Cpu, Hand, ScanLine } from "lucide-react";
import { ParticleEngine, type HandInput, type PxPoint } from "@/lib/particles";
import { STYLE_HUES, useSettings, type ParticleSettings } from "@/store/settings";
import type { TrackingFrame } from "@/hooks/useHandTracking";
import ControlPanel from "@/components/ControlPanel";

interface StageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  detect: (video: HTMLVideoElement, ts: number) => TrackingFrame;
  handsDetected: () => number;
  onExit: () => void;
}

function toPx(
  p: { x: number; y: number },
  video: HTMLVideoElement,
  W: number,
  H: number,
): PxPoint {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const scale = Math.max(W / vw, H / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const offX = (W - dispW) / 2;
  const offY = (H - dispH) / 2;
  return { x: offX + p.x * dispW, y: offY + p.y * dispH };
}

export default function Stage({
  videoRef,
  detect,
  handsDetected,
  onExit,
}: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settings = useSettings();
  const settingsRef = useRef<ParticleSettings>(settings);
  settingsRef.current = settings;

  const [fps, setFps] = useState(0);
  const [hands, setHands] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new ParticleEngine(canvas);
    const parent = canvas.parentElement!;
    const resize = () => {
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      engine.resize(r.width, r.height, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    let raf = 0;
    let last = performance.now();
    let lastVideoTime = -1;
    let latest: HandInput[] = [];
    let frameAcc = 0;
    let timeAcc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const video = videoRef.current;
      const s = settingsRef.current;
      const hues = STYLE_HUES[s.preset];

      if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const frame = detect(video, now);
        const W = engine.width;
        const H = engine.height;
        latest = frame.hands.map((h) => ({
          active: h.active,
          points: h.points.map((pp) => toPx(pp, video, W, H)),
        }));
      }

      engine.render(latest, dt, s, hues);

      frameAcc++;
      timeAcc += dt;
      if (timeAcc >= 0.5) {
        setFps(Math.round(frameAcc / timeAcc));
        setHands(handsDetected());
        frameAcc = 0;
        timeAcc = 0;
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [videoRef, detect, handsDetected]);

  return (
    <div className="absolute inset-0 z-10 select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 sm:left-4 sm:top-4">
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5">
          <span className="h-2 w-2 animate-flicker rounded-full bg-cyber-cyan shadow-[0_0_8px_#37e7ff]" />
          <span className="font-display text-[11px] tracking-[0.3em] text-white/80">
            PALM
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            / particle field
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 sm:bottom-4 sm:left-4">
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3 text-cyber-mint" />
          {fps} FPS
        </span>
        <span className="flex items-center gap-1.5">
          <Hand className="h-3 w-3 text-cyber-cyan" />
          检测到 {hands} 只手
        </span>
        <span className="flex items-center gap-1.5">
          <ScanLine className="h-3 w-3 text-cyber-magenta" />
          实时追踪中
        </span>
      </div>

      {hands === 0 && (
        <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 -translate-x-1/2">
          <div className="glass flex items-center gap-2 rounded-full px-5 py-2.5">
            <Activity className="h-3.5 w-3.5 animate-pulse text-cyber-cyan" />
            <span className="font-sans text-sm tracking-wide text-white/70">
              将手掌正对镜头，张开五指
            </span>
          </div>
        </div>
      )}

      <ControlPanel onExit={onExit} />
    </div>
  );
}
