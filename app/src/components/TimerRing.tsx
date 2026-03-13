import { useRef } from "react";

interface TimerRingProps {
  totalSeconds: number;
  remainingSeconds: number;
  active: boolean;
}

export default function TimerRing({
  totalSeconds,
  remainingSeconds,
  active,
}: TimerRingProps) {
  const SIZE = 200;
  const STROKE = 10;
  const RADIUS = (SIZE - STROKE * 2) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const idRef = useRef(`timer-grad-${Math.random().toString(36).slice(2)}`);

  return (
    <div className="timer-ring-wrap" aria-label={`Timer: ${timeStr}`}>
      <svg width={SIZE} height={SIZE} className={`timer-ring${active ? " timer-ring--active" : ""}`}>
        <defs>
          <linearGradient id={idRef.current} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />

        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${idRef.current})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: active ? "stroke-dashoffset 1s linear" : "none" }}
        />
      </svg>

      <div className="timer-ring-center">
        <span className="timer-display">{timeStr}</span>
        <span className="timer-label">{active ? "remaining" : "ready"}</span>
      </div>
    </div>
  );
}
