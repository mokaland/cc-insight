"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  title?: string;
  icon?: ReactNode;
  value?: string | number;
  subtitle?: string;
}

export function GlassCard({
  children,
  className,
  glowColor = "#ec4899",
  title,
  icon,
  value,
  subtitle,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 p-6",
        "backdrop-blur-xl bg-white/10 dark:bg-black/20",
        "shadow-xl transition-all duration-300 hover:scale-[1.02]",
        className
      )}
      style={{
        boxShadow: `0 0 30px ${glowColor}20, inset 0 0 30px ${glowColor}05`,
      }}
    >
      {/* Glow effect overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${glowColor}30 0%, transparent 60%)`,
        }}
      />
      
      {/* Border glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: `inset 0 0 1px 1px ${glowColor}40`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {icon && <div style={{ color: glowColor }}>{icon}</div>}
          </div>
        )}
        {value !== undefined && (
          <div className="text-3xl font-bold mb-1" style={{ textShadow: `0 0 20px ${glowColor}60` }}>
            {value}
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}

interface NeonGaugeProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  showTarget?: boolean;
}

export function NeonGauge({
  value,
  max,
  label,
  color = "#ec4899",
  showTarget = true,
}: NeonGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const isComplete = value >= max;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm">
          <span className="font-bold" style={{ color: isComplete ? "#22c55e" : color }}>
            {value}
          </span>
          {showTarget && <span className="text-muted-foreground"> / {max}</span>}
        </span>
      </div>
      <div className="relative h-4 bg-black/30 rounded-full overflow-hidden border border-white/10">
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(90deg, ${color}40, transparent)`,
          }}
        />
        {/* Progress bar */}
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background: isComplete 
              ? `linear-gradient(90deg, #22c55e, #4ade80)` 
              : `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: isComplete
              ? `0 0 20px #22c55e, 0 0 40px #22c55e60`
              : `0 0 20px ${color}, 0 0 40px ${color}60`,
          }}
        />
        {/* Animated pulse for complete */}
        {isComplete && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `linear-gradient(90deg, transparent, #22c55e40, transparent)`,
            }}
          />
        )}
      </div>
      {isComplete && (
        <p className="text-xs text-green-500 font-medium flex items-center gap-1">
          🎉 目標達成！
        </p>
      )}
    </div>
  );
}

interface TodayProgressProps {
  current: number;
  target: number;
  teamColor: string;
  teamName: string;
}

export function TodayProgress({ current, target, teamColor, teamName }: TodayProgressProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  return (
    <GlassCard glowColor={teamColor} className="col-span-full">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: teamColor, boxShadow: `0 0 10px ${teamColor}` }}
            />
            今日の進捗
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {teamName}の本日の投稿目標: {target}投稿
          </p>
          
          {/* Large Neon Gauge */}
          <div className="relative h-8 bg-black/30 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{
                width: `${percentage}%`,
                background: percentage >= 100
                  ? `linear-gradient(90deg, #22c55e, #4ade80)`
                  : `linear-gradient(90deg, ${teamColor}, ${teamColor}cc)`,
                boxShadow: percentage >= 100
                  ? `0 0 30px #22c55e, 0 0 60px #22c55e60`
                  : `0 0 30px ${teamColor}, 0 0 60px ${teamColor}60`,
              }}
            >
              {/* Animated shine effect */}
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
            {/* Percentage text inside bar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white drop-shadow-lg">
                {Math.round(percentage)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 md:gap-6">
          <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-3xl font-bold" style={{ color: teamColor, textShadow: `0 0 20px ${teamColor}60` }}>
              {current}
            </p>
            <p className="text-xs text-muted-foreground">投稿済み</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-3xl font-bold text-muted-foreground">
              {remaining}
            </p>
            <p className="text-xs text-muted-foreground">残り</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
