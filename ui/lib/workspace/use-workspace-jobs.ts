"use client";

import { useEffect, useState } from "react";
import { getElectronBridge } from "../electron";
import type { JobRecord } from "../workspace-types";

export function useWorkspaceJobs(): JobRecord[] {
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  useEffect(() => {
    const bridge = getElectronBridge();

    void bridge.jobs.list().then((jobList: JobRecord[]) => {
      setJobs(jobList || []);
    });

    const unsubscribe = bridge.jobs.subscribe((job: JobRecord) => {
      setJobs((previous) => {
        const existingIndex = previous.findIndex((entry) => entry.id === job.id);
        if (existingIndex >= 0) {
          const next = [...previous];
          next[existingIndex] = { ...next[existingIndex], ...job };
          return next;
        }
        return [job, ...previous];
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return jobs;
}
