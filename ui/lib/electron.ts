import type { MunajjamBridge } from "@/types/munajjam";

export function getElectronBridge(): MunajjamBridge {
  if (typeof window === "undefined" || !window.munajjam) {
    throw new Error("Munajjam desktop bridge unavailable");
  }
  return window.munajjam;
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && !!window.munajjam;
}
