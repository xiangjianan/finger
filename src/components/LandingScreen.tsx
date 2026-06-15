import { Camera, Hand, Loader2, ShieldAlert, Sparkles } from "lucide-react";

interface LandingScreenProps {
  modelStatus: "loading" | "ready" | "error";
  modelError: string | null;
  cameraStatus: "idle" | "requesting" | "ready" | "error";
  cameraError: string | null;
  onStart: () => void;
}

export default function LandingScreen({
  modelStatus,
  modelError,
  cameraStatus,
  cameraError,
  onStart,
}: LandingScreenProps) {
  const starting = cameraStatus === "requesting";
  const modelLoading = modelStatus === "loading";
  const disabled = starting || modelLoading;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden grain">
      <div className="pointer-events-none absolute inset-0 vignette" />
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 animate-spin-slow rounded-full border border-cyber-cyan/20" />
          <div className="absolute inset-8 animate-spin-rev rounded-full border border-dashed border-cyber-magenta/20" />
          <div className="absolute inset-20 animate-spin-slow rounded-full border border-cyber-violet/20" />
          <div className="absolute inset-0 animate-pulse-ring rounded-full bg-[radial-gradient(circle,rgba(55,231,255,0.16),transparent_65%)]" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-cyber-cyan" />
          <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/70">
            Realtime · Hand · Particles
          </span>
        </div>

        <h1 className="font-display text-6xl font-normal leading-none tracking-[0.06em] text-white neon-text sm:text-7xl">
          PALM
        </h1>
        <div className="mt-3 h-px w-40 neon-divider" />
        <p className="mt-4 font-display text-sm uppercase tracking-[0.5em] text-cyber-cyan/90 text-glow-cyan">
          粒子掌心
        </p>
        <p className="mt-4 max-w-md text-balance font-sans text-[15px] leading-relaxed text-white/55">
          开启摄像头，将手掌正对镜头并张开五指。
          粒子会环绕你的五根指尖流转，手移动时能量场会跟随起舞。
        </p>

        <button
          onClick={onStart}
          disabled={disabled}
          className="btn-primary mt-9 flex items-center gap-2.5"
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <span>
            {starting
              ? "正在开启摄像头"
              : modelLoading
                ? "模型加载中"
                : "开启摄像头"}
          </span>
        </button>

        <div className="mt-6 flex h-5 items-center gap-2 font-mono text-[11px] tracking-wider">
          {modelStatus === "loading" && (
            <span className="flex items-center gap-1.5 text-white/45">
              <Loader2 className="h-3 w-3 animate-spin" />
              加载手部识别模型…
            </span>
          )}
          {modelStatus === "ready" && (
            <span className="flex items-center gap-1.5 text-cyber-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-mint shadow-[0_0_8px_#6effb0]" />
              识别模型就绪
            </span>
          )}
          {modelStatus === "error" && (
            <span className="flex items-center gap-1.5 text-cyber-magenta">
              <ShieldAlert className="h-3.5 w-3.5" />
              {modelError ?? "模型加载失败"}
            </span>
          )}
        </div>

        {cameraError && (
          <p className="mt-3 max-w-sm rounded-md border border-cyber-magenta/30 bg-cyber-magenta/10 px-4 py-2 font-sans text-sm text-cyber-magenta/90">
            {cameraError}
          </p>
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
        <span className="flex items-center gap-1.5">
          <Hand className="h-3 w-3" /> 单手 / 双手
        </span>
        <span>·</span>
        <span>需要摄像头权限</span>
        <span>·</span>
        <span>建议 Chrome / Edge</span>
      </div>
    </div>
  );
}
