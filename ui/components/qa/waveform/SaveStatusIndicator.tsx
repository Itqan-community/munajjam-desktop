"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";

interface SaveStatusIndicatorProps {
  status: "saving" | "saved" | "error";
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const config = {
    saving: {
      className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      icon: <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />,
    },
    saved: {
      className: "bg-green-500/10 text-green-400 border border-green-500/20",
      icon: <Check className="w-3 h-3" aria-hidden="true" />,
    },
    error: {
      className: "bg-red-500/10 text-red-400 border border-red-500/20",
      icon: <AlertCircle className="w-3 h-3" aria-hidden="true" />,
    },
  } as const;

  const { className, icon } = config[status];

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${className}`}
      role="status"
      aria-live="polite"
    >
      {icon}
    </div>
  );
}
