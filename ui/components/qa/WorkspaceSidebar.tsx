"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Globe, Plus, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-context";
import { getElectronBridge } from "@/lib/electron";
import ProjectSection, { PROJECT_COLORS } from "./ProjectSection";

interface WorkspaceSidebarProps {
  locale: "en" | "ar";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const footerButtonClass =
  "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/10 transition-colors text-xs text-white/50 hover:text-white/70 app-no-drag rounded-lg";

export default function WorkspaceSidebar({ locale, collapsed = false, onToggleCollapse }: WorkspaceSidebarProps) {
  const t = useTranslations("qa.workspace");
  const pathname = usePathname();
  const router = useRouter();
  const isRTL = locale === "ar";
  const { state, dispatch, jobs } = useWorkspace();

  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const newProjectRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspaceId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleWorkspaceClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      // Normal click: clear selection and activate
      setSelectedIds(new Set());
      dispatch({ type: "SET_ACTIVE", id });
    }
  }, [dispatch]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    dispatch({ type: "BATCH_DELETE_WORKSPACES", ids: Array.from(selectedIds) });
    setSelectedIds(new Set());
  }, [selectedIds, dispatch]);

  // Clear selection on Escape
  useEffect(() => {
    if (selectedIds.size === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size]);

  useEffect(() => {
    if (creatingProject && newProjectRef.current) {
      newProjectRef.current.focus();
    }
  }, [creatingProject]);

  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  function handleCreateProject(): void {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setCreatingProject(false);
      return;
    }
    const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    dispatch({ type: "CREATE_PROJECT", name: trimmed, color: randomColor });
    setNewProjectName("");
    setCreatingProject(false);
  }

  function handleWorkspaceContextMenu(e: React.MouseEvent, workspaceId: string): void {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, workspaceId });
  }

  function moveWorkspace(projectId: string | null): void {
    if (!contextMenu) return;
    dispatch({
      type: "MOVE_WORKSPACE_TO_PROJECT",
      workspaceId: contextMenu.workspaceId,
      projectId,
    });
    setContextMenu(null);
  }

  const projectGroups = state.projects.map((p) => ({
    project: p,
    workspaces: state.workspaces.filter((ws) => ws.projectId === p.id),
  }));
  const uncategorized = state.workspaces.filter((ws) => !ws.projectId);

  // Determine chevron icon based on collapsed state and RTL
  const CollapseIcon = collapsed
    ? (isRTL ? ChevronLeft : ChevronRight)
    : (isRTL ? ChevronRight : ChevronLeft);

  const handleLocaleSwitch = useCallback(() => {
    const newLocale = locale === "ar" ? "en" : "ar";
    const nextPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(nextPath);
  }, [locale, pathname, router]);

  // --- Collapsed sidebar ---
  if (collapsed) {
    return (
      <aside
        className="flex flex-col w-[48px] shrink-0 h-full items-center"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Drag area at top */}
        <div className="h-11 shrink-0 app-drag w-full" />

        {/* Compact workspace dots */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1 w-full flex flex-col items-center">
          {/* New workspace button (icon only) */}
          <button
            onClick={() => dispatch({ type: "CREATE_WORKSPACE" })}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors app-no-drag rounded-lg"
            title={t("new")}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Workspace dots */}
          {state.workspaces.map((ws) => {
            const project = ws.projectId ? state.projects.find((p) => p.id === ws.projectId) : null;
            const isActive = ws.id === state.activeWorkspaceId;
            return (
              <button
                key={ws.id}
                onClick={() => dispatch({ type: "SET_ACTIVE", id: ws.id })}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  isActive ? "bg-white/20" : "hover:bg-white/10"
                }`}
                title={ws.label || t("new")}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: project?.color ?? "#6b7280" }}
                />
              </button>
            );
          })}
        </div>

        {/* Footer: language (icon only) + collapse toggle */}
        <div className="pb-2 space-y-1 flex flex-col items-center">
          <button
            onClick={handleLocaleSwitch}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors text-white/50 hover:text-white/70 rounded-lg"
            title={t("language")}
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors text-white/40 hover:text-white/70 rounded-lg"
            title={t("expandSidebar")}
          >
            <CollapseIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // --- Expanded sidebar ---
  return (
    <aside
      className="flex flex-col w-[240px] shrink-0 h-full"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header: title + new workspace */}
      <div className={`h-11 flex items-center px-3 app-drag shrink-0 ${!isRTL ? "ps-[76px]" : ""}`}>
        <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          {t("title")}
        </h2>
        <button
          onClick={() => dispatch({ type: "CREATE_WORKSPACE" })}
          className="flex items-center gap-1 px-2 py-1 ms-auto bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white transition-colors app-no-drag rounded-lg"
        >
          <Plus className="w-3 h-3" />
          <span>{t("new")}</span>
        </button>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Project groups */}
        {projectGroups.map(({ project, workspaces: ws }) => (
          <ProjectSection
            key={project.id}
            project={project}
            workspaces={ws}
            activeWorkspaceId={state.activeWorkspaceId}
            selectedWorkspaceIds={selectedIds}
            locale={locale}
            onSelectWorkspace={handleWorkspaceClick}
            onDeleteWorkspace={(id) => dispatch({ type: "DELETE_WORKSPACE", id })}
            onToggleCollapsed={() => dispatch({ type: "TOGGLE_PROJECT_COLLAPSED", id: project.id })}
            onRenameProject={(name) => dispatch({ type: "RENAME_PROJECT", id: project.id, name })}
            onDeleteProject={() => dispatch({ type: "DELETE_PROJECT", id: project.id })}
            onChangeColor={(color) =>
              dispatch({ type: "CHANGE_PROJECT_COLOR", id: project.id, color })
            }
            onWorkspaceContextMenu={handleWorkspaceContextMenu}
            onDropWorkspace={(wsId) =>
              dispatch({ type: "MOVE_WORKSPACE_TO_PROJECT", workspaceId: wsId, projectId: project.id })
            }
            jobs={jobs}
          />
        ))}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <ProjectSection
            project={null}
            workspaces={uncategorized}
            activeWorkspaceId={state.activeWorkspaceId}
            selectedWorkspaceIds={selectedIds}
            locale={locale}
            onSelectWorkspace={handleWorkspaceClick}
            onDeleteWorkspace={(id) => dispatch({ type: "DELETE_WORKSPACE", id })}
            onWorkspaceContextMenu={handleWorkspaceContextMenu}
            onDropWorkspace={(wsId) =>
              dispatch({ type: "MOVE_WORKSPACE_TO_PROJECT", workspaceId: wsId, projectId: null })
            }
            jobs={jobs}
          />
        )}

        {/* Empty state */}
        {state.workspaces.length === 0 && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="text-xs text-white/30 mb-3">{t("empty")}</p>
            <button
              onClick={() => dispatch({ type: "CREATE_WORKSPACE" })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/70 bg-white/5 hover:bg-white/10 transition-colors rounded-lg"
            >
              <Plus className="w-3 h-3" />
              <span>{t("new")}</span>
            </button>
          </div>
        )}

        {/* New Project button / inline input — at bottom of list */}
        {creatingProject ? (
          <div className="px-2 py-1">
            <input
              ref={newProjectRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") {
                  setCreatingProject(false);
                  setNewProjectName("");
                }
              }}
              onBlur={handleCreateProject}
              className="w-full bg-white/10 text-xs text-white rounded px-2 py-1 outline-none border border-white/20 focus:border-white/40 text-start"
              placeholder={t("projectNamePlaceholder")}
            />
          </div>
        ) : (
          <button
            onClick={() => setCreatingProject(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-white/30 hover:text-white/60 transition-colors rounded hover:bg-white/5"
          >
            <Plus className="w-3 h-3" />
            <span>{t("addProject")}</span>
          </button>
        )}
      </div>

      {/* Context menu for moving workspaces */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-neutral-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: isRTL ? undefined : contextMenu.x, right: isRTL ? (window.innerWidth - contextMenu.x) : undefined }}
        >
          <div className="px-3 py-1 text-[10px] text-white/30 uppercase tracking-wider text-start">
            {t("moveToProject")}
          </div>
          {state.projects.map((p) => (
            <button
              key={p.id}
              onClick={() => moveWorkspace(p.id)}
              className="w-full px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors flex items-center gap-2 text-start"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          <div className="border-t border-white/10 my-1" />
          <button
            onClick={() => moveWorkspace(null)}
            className="w-full px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 transition-colors text-start"
          >
            {t("removeFromProject")}
          </button>
        </div>
      )}

      {/* Bulk delete bar */}
      {selectedIds.size > 0 && (
        <div className="mx-2 mb-1 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-xs text-white/70 flex-1">
            {selectedIds.size} {t("selected")}
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            {t("delete")}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 pb-2 space-y-1">
        <button
          onClick={handleLocaleSwitch}
          className={footerButtonClass}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-start">{t("language")}</span>
          <span className="text-[11px] text-white/30 font-medium">
            {locale === "ar" ? "EN" : "\u0639\u0631\u0628\u064a"}
          </span>
        </button>
        {/* Reset onboarding (dev) */}
        <button
          onClick={() => {
            dispatch({ type: "COMPLETE_ONBOARDING" });
            // Set it to false directly via the bridge then reload
            getElectronBridge().data.getWorkspaceState().then((saved) => {
              if (saved && typeof saved === "object" && !Array.isArray(saved)) {
                const updated = {
                  ...(saved as Record<string, unknown>),
                  onboardingCompleted: false,
                };
                getElectronBridge().data.saveWorkspaceState(updated).then(() => {
                  window.location.reload();
                });
              }
            });
          }}
          className={footerButtonClass}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-start">Reset Onboarding</span>
        </button>
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={footerButtonClass}
        >
          <CollapseIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-start">{t("collapseSidebar")}</span>
        </button>
      </div>
    </aside>
  );
}
