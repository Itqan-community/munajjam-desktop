import { useEffect } from "react";
import type { JobRecord } from "../workspace-types";
import type { WorkspaceRecord } from "./workspace-domain-types";

interface UseWorkspaceJobEffectsInput {
  workspaces: WorkspaceRecord[];
  jobs: JobRecord[];
  updateWorkspace: (workspaceId: string, updates: Partial<WorkspaceRecord>) => void;
}

export function useWorkspaceJobEffects({
  workspaces,
  jobs,
  updateWorkspace,
}: UseWorkspaceJobEffectsInput): void {
  useEffect(() => {
    for (const workspace of workspaces) {
      if (workspace.status !== "processing" || !workspace.jobId) {
        continue;
      }

      const job = jobs.find((candidate) => candidate.id === workspace.jobId);
      if (!job) {
        continue;
      }

      if (job.status === "completed") {
        updateWorkspace(workspace.id, {
          status: "loading",
          loading: true,
          jobId: null,
        });
        continue;
      }

      if (job.status === "failed" || job.status === "canceled") {
        updateWorkspace(workspace.id, {
          status: "error",
          error:
            job.status === "canceled"
              ? "Job was canceled."
              : "Job failed. Check the jobs panel for details.",
          jobId: null,
        });
      }
    }
  }, [jobs, workspaces, updateWorkspace]);
}
