"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { isDesktop, getElectronBridge } from "@/lib/electron";
import { useEnv } from "@/lib/env-context";
import type { EnvInstallProgress } from "@/types/munajjam";

type Variant = "text" | "icon";
type Phase = "idle" | "confirming" | "installing" | "done" | "failed";

interface Props {
  variant?: Variant;
}

export default function ReinstallRuntimeButton({ variant = "text" }: Props) {
  const t = useTranslations("qa.setup");
  const { recheck } = useEnv();
  const [phase, setPhase] = useState<Phase>("idle");
  const [output, setOutput] = useState<string[]>([]);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!isDesktop()) return null;

  const reset = () => {
    setPhase("idle");
    setOutput([]);
  };

  const runInstall = async () => {
    setPhase("installing");
    setOutput([]);
    const bridge = getElectronBridge();

    const unsubscribe = bridge.env.subscribe((progress: EnvInstallProgress) => {
      if (progress.type === "stdout" || progress.type === "stderr") {
        setOutput((prev) => [...prev, progress.data]);
        return;
      }
      if (progress.type === "exit") {
        unsubscribe();
        setPhase(progress.exitCode === 0 ? "done" : "failed");
        if (progress.exitCode === 0) {
          recheck();
        }
      }
    });

    try {
      await bridge.env.installRuntime();
    } catch {
      unsubscribe();
      setPhase("failed");
    }
  };

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setPhase("confirming")}
        className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/10 transition-colors text-white/60 app-no-drag rounded-lg shrink-0"
        aria-label={t("reinstallTooltip")}
        title={t("reinstallTooltip")}
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setPhase("confirming")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors rounded-lg app-no-drag"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {t("reinstallButton")}
      </button>
    );

  return (
    <>
      {trigger}
      {phase !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm app-no-drag"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget && phase !== "installing") {
              reset();
            }
          }}
        >
          <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
            {phase === "confirming" && (
              <>
                <h3 className="text-base font-semibold text-white">
                  {t("reinstallConfirmTitle")}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {t("reinstallConfirmDesc")}
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={runInstall}
                    className="px-4 py-2 text-sm bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
                  >
                    {t("reinstallConfirm")}
                  </button>
                </div>
              </>
            )}

            {(phase === "installing" || phase === "done" || phase === "failed") && (
              <>
                <h3 className="text-base font-semibold text-white">
                  {phase === "installing"
                    ? t("installing")
                    : phase === "done"
                      ? t("installSuccess")
                      : t("installFailed")}
                </h3>
                <pre
                  ref={outputRef}
                  className="bg-black/40 border border-white/10 rounded-lg p-3 text-[11px] font-mono text-white/70 max-h-72 overflow-auto whitespace-pre-wrap break-all"
                >
                  {output.join("")}
                </pre>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    disabled={phase === "installing"}
                    className="px-4 py-2 text-sm bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("reinstallClose")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
