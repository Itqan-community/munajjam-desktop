"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { isDesktop, getElectronBridge } from "@/lib/electron";
import type { EnvCheckResult } from "@/types/munajjam";

type EnvStatus = "loading" | "ready" | "failed";

interface EnvContextValue {
  status: EnvStatus;
  result: EnvCheckResult | null;
  recheck: () => void;
}

const EnvContext = createContext<EnvContextValue>({
  status: "ready",
  result: null,
  recheck: () => {},
});

export function useEnv() {
  return useContext(EnvContext);
}

export function EnvProvider({ children }: { children: ReactNode }) {
  // Always start "ready" so SSR and first client render match.
  // The useEffect below flips to "loading" and runs the check on mount.
  const [status, setStatus] = useState<EnvStatus>("ready");
  const [result, setResult] = useState<EnvCheckResult | null>(null);

  const runCheck = useCallback(async () => {
    if (!isDesktop()) {
      setStatus("ready");
      return;
    }

    setStatus("loading");
    try {
      const bridge = getElectronBridge();
      const checkResult = await bridge.env.check();
      setResult(checkResult);
      setStatus(checkResult.python && checkResult.munajjam ? "ready" : "failed");
    } catch {
      setStatus("failed");
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <EnvContext.Provider value={{ status, result, recheck: runCheck }}>
      {children}
    </EnvContext.Provider>
  );
}
