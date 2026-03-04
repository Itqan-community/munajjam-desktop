"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { RecitersProvider } from "@/lib/reciters-context";
import { EnvProvider, useEnv } from "@/lib/env-context";
import TitleBar from "@/components/qa/TitleBar";
import WorkspaceSidebar from "@/components/qa/WorkspaceSidebar";
import WorkspaceSetupView from "@/components/qa/WorkspaceSetupView";
import WorkspaceContent from "@/components/qa/WorkspaceContent";
import EmptyStateView from "@/components/qa/EmptyStateView";
import ProcessingView from "@/components/qa/ProcessingView";
import OnboardingOverlay from "@/components/qa/OnboardingOverlay";
import SetupAssistantView from "@/components/qa/SetupAssistantView";

// ---------------------------------------------------------------------------
// Desktop Layout (multi-workspace)
// ---------------------------------------------------------------------------

function DesktopLayoutInner({ locale }: { locale: string }) {
  const isRTL = locale === "ar";
  const platform = (typeof window !== "undefined" && window.munajjam?.platform) || "darwin";
  const isMac = platform === "darwin";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      <div
        className={`fixed inset-0 z-0 ${isMac ? "opacity-60" : "opacity-90"}`}
        style={{ background: 'var(--desktop-bg)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar — full height, collapsible */}
        <motion.div
          className="flex flex-col shrink-0 overflow-hidden"
          animate={{ width: sidebarCollapsed ? 48 : 240 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <WorkspaceSidebar
            locale={locale as "en" | "ar"}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </motion.div>

        {/* Content column */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden bg-black/60 backdrop-blur-2xl border border-white/[0.06] rounded-2xl rounded-se-none rounded-ee-none">
            <TitleBar locale={locale} />
            <DesktopMainContent locale={locale} />
          </div>
        </div>
      </div>

      <OnboardingOverlay />
    </div>
  );
}

function DesktopMainContent({ locale }: { locale: string }) {
  const { activeWorkspace, jobs } = useWorkspace();
  const { status: envStatus } = useEnv();

  if (envStatus === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="loading" aria-hidden="true" />
          <span className="text-sm text-white/60">Checking environment...</span>
        </div>
      </div>
    );
  }

  if (envStatus === "failed") {
    return <SetupAssistantView />;
  }

  if (!activeWorkspace) {
    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
        <EmptyStateView />
      </div>
    );
  }

  // Ready state: no page scroll — flex column, only AyahList scrolls internally
  if (activeWorkspace.status === "ready") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`ready-${activeWorkspace.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <WorkspaceContent />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Setup state: no page scroll — fills available space, scrolls internally
  if (activeWorkspace.status === "setup") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`setup-${activeWorkspace.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <WorkspaceSetupView locale={locale as "en" | "ar"} />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Other non-ready states: scrollable content area
  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
      <AnimatePresence mode="wait">

        {activeWorkspace.status === "processing" && (
          <ProcessingView
            job={activeWorkspace.jobId ? jobs.find((j) => j.id === activeWorkspace.jobId) ?? null : null}
            jobId={activeWorkspace.jobId}
            locale={locale}
          />
        )}

        {activeWorkspace.status === "loading" && (
          <motion.div
            key={`loading-${activeWorkspace.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-64"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="loading" aria-hidden="true" />
              <span className="text-sm text-white/60">Loading...</span>
            </div>
          </motion.div>
        )}

        {activeWorkspace.status === "error" && (
          <motion.div
            key={`error-${activeWorkspace.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card-glass p-8 text-center"
          >
            <div className="flex flex-col items-center gap-4">
              <svg className="w-12 h-12 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white/70">{activeWorkspace.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function HomePage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";

  return (
    <RecitersProvider>
      <WorkspaceProvider>
        <EnvProvider>
          <DesktopLayoutInner locale={locale} />
        </EnvProvider>
      </WorkspaceProvider>
    </RecitersProvider>
  );
}
