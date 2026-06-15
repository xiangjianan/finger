import { useState } from "react";
import {
  Activity,
  Link2,
  Maximize2,
  Minimize2,
  Power,
  Settings2,
  Spline,
  Video,
  VideoOff,
} from "lucide-react";
import {
  STYLE_LABEL,
  type StylePreset,
  useSettings,
} from "@/store/settings";

interface ControlPanelProps {
  onExit: () => void;
}

const PRESETS: StylePreset[] = ["neon", "aurora", "ember"];

export default function ControlPanel({ onExit }: ControlPanelProps) {
  const settings = useSettings();
  const [open, setOpen] = useState(true);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:text-cyber-cyan"
        aria-label="切换面板"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="glass w-[230px] rounded-xl p-3.5 font-sans">
          <Section label="能量风格">
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => settings.setPreset(p)}
                  className={`rounded-md border px-2 py-1.5 text-xs tracking-wider transition ${
                    settings.preset === p
                      ? "border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan"
                      : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25"
                  }`}
                >
                  {STYLE_LABEL[p]}
                </button>
              ))}
            </div>
          </Section>

          <Section
            label="强度"
            right={
              <span className="font-mono text-[11px] text-cyber-cyan">
                {settings.intensity.toFixed(1)}x
              </span>
            }
          >
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.1}
              value={settings.intensity}
              onChange={(e) => settings.setIntensity(parseFloat(e.target.value))}
              className="slider-cyan h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10"
            />
          </Section>

          <Section label="显示层">
            <div className="grid grid-cols-2 gap-1.5">
              <Toggle
                active={settings.showVideo}
                onClick={settings.toggleVideo}
                icon={
                  settings.showVideo ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5" />
                  )
                }
                label="画面"
              />
              <Toggle
                active={settings.showLinks}
                onClick={settings.toggleLinks}
                icon={<Link2 className="h-3.5 w-3.5" />}
                label="能量链"
              />
              <Toggle
                active={settings.showSkeleton}
                onClick={settings.toggleSkeleton}
                icon={<Spline className="h-3.5 w-3.5" />}
                label="骨架"
              />
              <Toggle
                active={true}
                onClick={toggleFullscreen}
                icon={
                  document.fullscreenElement ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )
                }
                label="全屏"
              />
            </div>
          </Section>

          <button
            onClick={onExit}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-cyber-magenta/30 bg-cyber-magenta/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-cyber-magenta transition hover:bg-cyber-magenta/20"
          >
            <Power className="h-3.5 w-3.5" />
            退出
          </button>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-white/40">
          <Activity className="h-3 w-3" />
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] tracking-wider transition ${
        active
          ? "border-cyber-cyan/50 bg-cyber-cyan/10 text-cyber-cyan"
          : "border-white/10 bg-white/[0.02] text-white/45 hover:border-white/25"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
