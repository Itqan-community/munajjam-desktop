"use client";

import { useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TimeInputProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
}

export function TimeInput({ label, value, onChange }: TimeInputProps) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const milliseconds = Math.round((value % 1) * 100);

  const adjustTime = useCallback(
    (delta: number) => onChange(Math.max(0, value + delta)),
    [onChange, value],
  );

  const setComponent = useCallback(
    (type: "min" | "sec" | "ms", newVal: number) => {
      const clampedVal =
        type === "min"
          ? Math.max(0, newVal)
          : type === "sec"
            ? Math.max(0, Math.min(59, newVal))
            : Math.max(0, Math.min(99, newVal));

      const newTime =
        type === "min"
          ? clampedVal * 60 + seconds + milliseconds / 100
          : type === "sec"
            ? minutes * 60 + clampedVal + milliseconds / 100
            : minutes * 60 + seconds + clampedVal / 100;

      onChange(newTime);
    },
    [onChange, minutes, seconds, milliseconds],
  );

  const buttonClass = "p-0.5 rounded text-white/30 hover:text-white/70 hover:bg-white/10 transition-all";
  const inputBaseClass =
    "h-7 bg-white/5 border border-white/10 rounded text-center text-xs font-mono text-white focus:outline-none focus:border-white/30";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-0.5">
        <div className="flex flex-col items-center">
          <button onClick={() => adjustTime(60)} className={buttonClass}>
            <ChevronUp className="w-3 h-3" />
          </button>
          <input
            type="text"
            value={minutes.toString()}
            onChange={(e) => setComponent("min", parseInt(e.target.value, 10) || 0)}
            className={`w-7 ${inputBaseClass}`}
          />
          <button onClick={() => adjustTime(-60)} className={buttonClass}>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <span className="text-white/30 font-mono text-sm pb-0.5">:</span>

        <div className="flex flex-col items-center">
          <button onClick={() => adjustTime(1)} className={buttonClass}>
            <ChevronUp className="w-3 h-3" />
          </button>
          <input
            type="text"
            value={seconds.toString().padStart(2, "0")}
            onChange={(e) => setComponent("sec", parseInt(e.target.value, 10) || 0)}
            className={`w-8 ${inputBaseClass}`}
          />
          <button onClick={() => adjustTime(-1)} className={buttonClass}>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <span className="text-white/30 font-mono text-sm pb-0.5">.</span>

        <div className="flex flex-col items-center">
          <button onClick={() => adjustTime(0.05)} className={buttonClass}>
            <ChevronUp className="w-3 h-3" />
          </button>
          <input
            type="text"
            value={milliseconds.toString().padStart(2, "0")}
            onChange={(e) => setComponent("ms", parseInt(e.target.value, 10) || 0)}
            className={`w-8 ${inputBaseClass}`}
          />
          <button onClick={() => adjustTime(-0.05)} className={buttonClass}>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
