"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X, Loader2, Copy, Terminal, RefreshCw, ChevronRight } from "lucide-react";
import { useEnv } from "@/lib/env-context";
import { getElectronBridge, isDesktop } from "@/lib/electron";
import type { EnvCheckResult, EnvInstallProgress } from "@/types/munajjam";

function CheckItem({ label, status }: { label: string; status: boolean | null }) {
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
      <span className={`text-sm ${status === false ? "text-red-400" : "text-white/70"}`}>
        {label}
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("qa.setup");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
      title={t("copyCommand")}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PlatformInstructions({ platform }: { platform: string }) {
  const t = useTranslations("qa.setup");

  const commands: Record<string, { label: string; command: string }> = {
    darwin: { label: "macOS", command: "brew install python@3.12" },
    win32: { label: "Windows", command: "winget install Python.Python.3.12" },
    linux: { label: "Linux", command: "sudo apt install python3 python3-pip" },
  };

  const current = commands[platform] || commands.linux;

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h4 className="text-sm font-medium text-white/80 mb-3">{t("installPythonTitle")}</h4>
      <p className="text-xs text-white/50 mb-3">{t("installPythonDesc", { platform: current.label })}</p>
      <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 font-mono text-xs text-white/70">
        <code className="flex-1 select-all">{current.command}</code>
        <CopyButton text={current.command} />
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
      const bridge = getElectronBridge();
      await bridge.env.installMunajjam(
        result.localPackageAvailable && result.localPackagePath
          ? { editable: true, packagePath: result.localPackagePath }
          : undefined
      );
    } catch {
      setInstalling(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h4 className="text-sm font-medium text-white/80 mb-3">{t("installMunajjamTitle")}</h4>
      <p className="text-xs text-white/50 mb-4">{t("installMunajjamDesc")}</p>

      <button
        onClick={handleInstall}
        disabled={installing}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {installing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {installing ? t("installing") : t("installButton")}
      </button>

      {output.length > 0 && (
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
      )}
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
  const pipOk = isLoading ? null : result?.pip ?? false;
  const munajjamOk = isLoading ? null : result?.munajjam ?? false;

  const pythonLabel = result?.pythonVersion
    ? `Python (${result.pythonVersion})`
    : "Python";
  const munajjamLabel = result?.munajjamVersion
    ? `munajjam (${result.munajjamVersion})`
    : "munajjam";

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
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white/90 mb-1">{t("title")}</h2>
          <p className="text-sm text-white/50">{t("description")}</p>
        </div>

        {/* Checklist card */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-2">
          <CheckItem label={pythonLabel} status={pythonOk} />
          <CheckItem label="pip" status={pipOk} />
          <CheckItem label={munajjamLabel} status={munajjamOk} />
        </div>

        {/* Platform instructions (if Python missing) */}
        {result && !result.python && (
          <PlatformInstructions platform={result.platform} />
        )}

        {/* Install card (if Python ok but munajjam missing) */}
        {result && result.python && result.pip && !result.munajjam && (
          <InstallCard result={result} onInstallComplete={handleInstallComplete} />
        )}

        {/* Action bar */}
        <div className={`flex items-center gap-3 mt-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            onClick={recheck}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("recheck")}
          </button>

          {result?.python && result?.munajjam && (
            <button
              onClick={recheck}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm text-white/80 transition-colors"
            >
              {t("continue")}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
