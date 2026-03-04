"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Project, WorkspaceRecord, JobRecord } from "@/lib/workspace-types";
import { confirmAction } from "@/lib/confirm";
import WorkspaceItem from "./WorkspaceItem";

const PROJECT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#d946ef", "#ec4899",
];

const menuItemClass =
  "w-full px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors text-start";

interface ProjectSectionProps {
  project: Project | null;
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string | null;
  selectedWorkspaceIds?: Set<string>;
  locale: "en" | "ar";
  onSelectWorkspace: (id: string, e: React.MouseEvent) => void;
  onDeleteWorkspace: (id: string) => void;
  onToggleCollapsed?: () => void;
  onRenameProject?: (name: string) => void;
  onDeleteProject?: () => void;
  onChangeColor?: (color: string) => void;
  onWorkspaceContextMenu: (e: React.MouseEvent, workspaceId: string) => void;
  onDropWorkspace: (workspaceId: string) => void;
  jobs?: JobRecord[];
}

export default function ProjectSection({
  project,
  workspaces,
  activeWorkspaceId,
  selectedWorkspaceIds,
  locale,
  onSelectWorkspace,
  onDeleteWorkspace,
  onToggleCollapsed,
  onRenameProject,
  onDeleteProject,
  onChangeColor,
  onWorkspaceContextMenu,
  onDropWorkspace,
  jobs,
}: ProjectSectionProps) {
  const t = useTranslations("qa.workspace");
  const isRTL = locale === "ar";
  const isUncategorized = project === null;
  const collapsed = project?.collapsed ?? false;

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleRenameSubmit(): void {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameProject?.(trimmed);
    setRenaming(false);
  }

  function handleDragEnter(e: React.DragEvent): void {
    if (!e.dataTransfer.types.includes("text/x-workspace-id")) return;
    e.preventDefault();
    dragCountRef.current++;
    setDragOver(true);
  }

  function handleDragLeave(): void {
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setDragOver(false);
    }
  }

  function handleDragOver(e: React.DragEvent): void {
    if (!e.dataTransfer.types.includes("text/x-workspace-id")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    dragCountRef.current = 0;
    setDragOver(false);
    const wsId = e.dataTransfer.getData("text/x-workspace-id");
    if (wsId) onDropWorkspace(wsId);
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`rounded-lg transition-colors ${dragOver ? "bg-white/[0.08] ring-1 ring-white/20" : ""}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 group cursor-pointer select-none"
        onClick={() => !isUncategorized && onToggleCollapsed?.()}
      >
        {!isUncategorized && (
          <ChevronRight
            className={`w-3 h-3 text-white/30 transition-transform ${
              collapsed ? (isRTL ? "-scale-x-100" : "") : "rotate-90"
            }`}
          />
        )}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: project?.color ?? "#6b7280" }}
        />
        {renaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/10 text-xs text-white rounded px-1.5 py-0.5 outline-none border border-white/20 focus:border-white/40 min-w-0 text-start"
            placeholder={t("projectNamePlaceholder")}
          />
        ) : (
          <span className="text-xs font-medium text-white/60 truncate flex-1">
            {isUncategorized ? t("uncategorized") : project.name}
          </span>
        )}
        <span className="text-[10px] text-white/30">{workspaces.length}</span>
        {!isUncategorized && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
                setColorPickerOpen(false);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
            </button>
            {menuOpen && (
              <div className="absolute top-full end-0 mt-1 z-50 bg-neutral-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(project.name);
                    setRenaming(true);
                    setMenuOpen(false);
                  }}
                  className={menuItemClass}
                >
                  {t("renameProject")}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerOpen(!colorPickerOpen);
                  }}
                  className={menuItemClass}
                >
                  {t("changeColor")}
                </button>
                {colorPickerOpen && (
                  <div className="px-3 py-2 grid grid-cols-5 gap-1.5">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeColor?.(c);
                          setMenuOpen(false);
                          setColorPickerOpen(false);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          project.color === c ? "border-white" : "border-transparent hover:border-white/40"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirmAction(t("deleteProjectConfirm"))) {
                      onDeleteProject?.();
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-red-400 hover:bg-white/10 transition-colors text-start"
                >
                  {t("deleteProject")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workspace list */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`space-y-0.5 ${!isUncategorized ? "ps-2" : ""}`}>
              {workspaces.map((ws) => {
                const job = ws.jobId && jobs ? jobs.find((j) => j.id === ws.jobId) : null;
                const jobProgress = job && job.total_surahs
                  ? { processed: job.processed ?? 0, total: job.total_surahs }
                  : null;
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <WorkspaceItem
                      workspace={ws}
                      isActive={ws.id === activeWorkspaceId}
                      isSelected={selectedWorkspaceIds?.has(ws.id)}
                      locale={locale}
                      onClick={(e) => onSelectWorkspace(ws.id, e)}
                      onDelete={() => onDeleteWorkspace(ws.id)}
                      onContextMenu={(e) => onWorkspaceContextMenu(e, ws.id)}
                      jobProgress={jobProgress}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { PROJECT_COLORS };
