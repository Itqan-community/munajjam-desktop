"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Check, ChevronRight, Loader2, RefreshCw, Terminal, X } from "lucide-react";
import { useEnv } from "@/lib/env-context";
import { getElectronBridge, isDesktop } from "@/lib/electron";
import type { EnvCheckResult, EnvInstallProgress } from "@/types/munajjam";
import { getSetupAssistantState } from "./setup-assistant-state";

function CheckItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: boolean | null;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-5 h-5 flex items-center justify-center">
        {status === null ? (
          <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
        ) : status ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <X className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${status === false ? "text-red-400" : "text-white/70"}`}>{label}</div>
        {detail ? <div className="text-[11px] text-white/35 truncate">{detail}</div> : null}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  description,
  tone = "default",
  footer,
}: {
  title: string;
  description: string;
  tone?: "default" | "warning";
  footer?: ReactNode;
}) {
  const toneClasses =
    tone === "warning"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-100"
      : "bg-white/5 border-white/10 text-white/80";

  return (
    <div className={`mt-4 p-4 rounded-xl border ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-4 h-4 mt-0.5 ${tone === "warning" ? "text-amber-300" : "text-white/50"}`} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium mb-2">{title}</h4>
          <p className={`text-xs ${tone === "warning" ? "text-amber-100/80" : "text-white/50"}`}>{description}</p>
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

function InstallCard({
  result,
  onInstallComplete,
}: {
  result: EnvCheckResult;
  onInstallComplete: () => void;
}) {
  const t = useTranslations("qa.setup");
  const [installing, setInstalling] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (!isDesktop()) return;
    const bridge = getElectronBridge();
    const unsubscribe = bridge.env.subscribe((progress: EnvInstallProgress) => {
      if (progress.type === "stdout" || progress.type === "stderr") {
        setOutput((prev) => [...prev, progress.data]);
      }
      if (progress.type === "exit") {
        setInstalling(false);
        if (progress.exitCode === 0) {
          onInstallComplete();
        }
      }
    });
    return unsubscribe;
  }, [onInstallComplete]);

  const handleInstall = async () => {
    if (!isDesktop()) return;
    setInstalling(true);
    setOutput([]);
    try {
      await getElectronBridge().env.installRuntime();
    } catch {
      setInstalling(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h4 className="text-sm font-medium text-white/80 mb-3">{t("installRuntimeTitle")}</h4>
      <p className="text-xs text-white/50 mb-4">
        {t("installRuntimeDesc", {
          packageManager: result.packageManagerName ?? t("packageManagerUnknown"),
        })}
      </p>

      {result.managedInstallPath ? (
        <div className="mb-4 rounded-lg bg-black/30 px-3 py-2 text-[11px] text-white/45 font-mono break-all">
          <span className="text-white/60">{t("managedInstallPathLabel")}:</span> {result.managedInstallPath}
        </div>
      ) : null}

      {!result.packageManagerAvailable ? (
        <InfoCard
          tone="warning"
          title={t("packageManagerMissingTitle")}
          description={t("packageManagerMissingDesc", {
            packageManager: result.packageManagerName ?? t("packageManagerUnknown"),
          })}
        />
      ) : null}

      <button
        onClick={handleInstall}
        disabled={installing || !result.packageManagerAvailable}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {installing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
        {installing ? t("installing") : t("installButton")}
      </button>

      {output.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
            <Terminal className="w-3.5 h-3.5" />
            {t("terminalTitle")}
          </div>
          <div
            ref={terminalRef}
            className="bg-black/60 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-white/60 whitespace-pre-wrap"
          >
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SetupAssistantView() {
  const t = useTranslations("qa.setup");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isRTL = locale === "ar";
  const { status, result, recheck } = useEnv();

  const isLoading = status === "loading";
  const pythonOk = isLoading ? null : result?.python ?? false;
  const ffmpegOk = isLoading ? null : result?.ffmpeg ?? false;
  const munajjamOk = isLoading ? null : result?.munajjam ?? false;
  const setupState = getSetupAssistantState(result);

  const pythonLabel = result?.pythonVersion ? `Python (${result.pythonVersion})` : t("pythonLabel");
  const munajjamLabel = result?.munajjamVersion ? `munajjam (${result.munajjamVersion})` : t("munajjamLabel");

  const handleInstallComplete = useCallback(() => {
    setTimeout(() => recheck(), 500);
  }, [recheck]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col items-center justify-center px-6 md:px-8 py-8"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white/90 mb-1">{t("title")}</h2>
          <p className="text-sm text-white/50">{t("description")}</p>
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-2">
          <CheckItem label={pythonLabel} status={pythonOk} detail={result?.pythonPath} />
          <CheckItem label={t("ffmpegLabel")} status={ffmpegOk} detail={result?.ffmpegPath} />
          <CheckItem label={munajjamLabel} status={munajjamOk} detail={result?.managedInstallPath} />
        </div>

        {setupState.showUnsupported ? (
          <InfoCard
            tone="warning"
            title={t("unsupportedPlatformTitle")}
            description={t("unsupportedPlatformDesc")}
          />
        ) : null}

        {result && setupState.showInstaller ? (
          <InstallCard result={result} onInstallComplete={handleInstallComplete} />
        ) : null}

        <div className={`flex items-center gap-3 mt-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            onClick={recheck}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("recheck")}
          </button>

          {setupState.isReady ? (
            <button
              onClick={recheck}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm text-white/80 transition-colors"
            >
              {t("continue")}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
