"use client";

import { motion } from "framer-motion";

export function WaveformAnimation({ reduced }: { reduced: boolean }) {
  const barCount = 32;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const base = Math.sin(i * 0.4) * 0.4 + 0.5;
    return { index: i, height: base };
  });

  return (
    <svg viewBox="0 0 200 60" className="w-full h-16" aria-hidden="true">
      {bars.map((bar) => {
        const height = bar.height * 40;
        const y = 30 - height / 2;
        return (
          <motion.rect
            key={bar.index}
            x={bar.index * 6 + 2}
            y={y}
            width={4}
            rx={2}
            fill="currentColor"
            className="text-white/40"
            initial={{ height: 0, y: 30 }}
            animate={
              reduced
                ? { height, y }
                : {
                    height: [height * 0.3, height, height * 0.6, height * 0.9, height * 0.5],
                    y: [
                      30 - (height * 0.3) / 2,
                      y,
                      30 - (height * 0.6) / 2,
                      30 - (height * 0.9) / 2,
                      30 - (height * 0.5) / 2,
                    ],
                  }
            }
            transition={
              reduced
                ? { duration: 0.3, delay: bar.index * 0.02 }
                : {
                    duration: 2.5,
                    delay: bar.index * 0.06,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }
            }
          />
        );
      })}
    </svg>
  );
}

export function ProcessingAnimation({ reduced }: { reduced: boolean }) {
  const steps = ["Detecting silences", "Transcribing", "Aligning", "Saving"];

  return (
    <div className="w-full space-y-3">
      <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-400/80 to-emerald-500/80"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={reduced ? { duration: 0.5 } : { duration: 3, ease: "easeInOut" }}
        />
        {!reduced && (
          <motion.div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
            initial={{ left: "0%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        )}
      </div>
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <motion.span
            key={step}
            className="text-[10px] text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : index * 0.4, duration: 0.3 }}
          >
            {step}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

export function RegionEditorAnimation({ reduced }: { reduced: boolean }) {
  const regions = [
    { x: 10, width: 40, color: "rgb(74, 222, 128)" },
    { x: 55, width: 35, color: "rgb(250, 204, 21)" },
    { x: 95, width: 45, color: "rgb(74, 222, 128)" },
    { x: 145, width: 30, color: "rgb(248, 113, 113)" },
  ];

  return (
    <svg viewBox="0 0 200 50" className="w-full h-12" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => {
        const height = (Math.sin(i * 0.5) * 0.3 + 0.5) * 30;
        return (
          <rect
            key={i}
            x={i * 5}
            y={25 - height / 2}
            width={3}
            height={height}
            rx={1.5}
            fill="white"
            opacity={0.15}
          />
        );
      })}
      {regions.map((region, index) => (
        <motion.rect
          key={region.x}
          x={region.x}
          y={5}
          width={region.width}
          height={40}
          rx={3}
          fill={region.color}
          opacity={0}
          animate={{ opacity: 0.25 }}
          transition={{
            delay: reduced ? 0 : index * 0.5,
            duration: reduced ? 0.1 : 0.5,
          }}
        />
      ))}
      {!reduced && (
        <motion.line
          x1={0}
          y1={0}
          x2={0}
          y2={50}
          stroke="white"
          strokeWidth={1.5}
          opacity={0.6}
          animate={{ x1: [0, 200], x2: [0, 200] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      )}
    </svg>
  );
}

export function HeroWaveform({ reduced }: { reduced: boolean }) {
  const barCount = 48;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const base = Math.sin(i * 0.3) * 0.35 + Math.cos(i * 0.15) * 0.2 + 0.45;
    return { index: i, height: Math.max(0.1, Math.min(1, base)) };
  });

  const regions = [
    { start: 0, end: 10, color: "rgb(74, 222, 128)" },
    { start: 10, end: 18, color: "rgb(250, 204, 21)" },
    { start: 18, end: 30, color: "rgb(74, 222, 128)" },
    { start: 30, end: 38, color: "rgb(74, 222, 128)" },
    { start: 38, end: 48, color: "rgb(250, 204, 21)" },
  ];

  const getColor = (barIndex: number) =>
    regions.find((region) => barIndex >= region.start && barIndex < region.end)?.color ?? "white";

  return (
    <svg viewBox="0 0 300 80" className="h-20 w-full max-w-md" aria-hidden="true">
      {bars.map((bar) => {
        const height = bar.height * 60;
        const y = 40 - height / 2;
        return (
          <motion.rect
            key={bar.index}
            x={bar.index * 6 + 3}
            width={4}
            rx={2}
            fill={getColor(bar.index)}
            initial={{ height: 0, y: 40, opacity: 0 }}
            animate={{ height, y, opacity: 0.7 }}
            transition={{
              delay: reduced ? 0 : bar.index * 0.04,
              duration: reduced ? 0.2 : 0.5,
              ease: "easeOut",
            }}
          />
        );
      })}
    </svg>
  );
}
