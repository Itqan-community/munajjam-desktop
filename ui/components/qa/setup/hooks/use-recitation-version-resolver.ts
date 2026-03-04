import { useCallback, useEffect, useState } from "react";
import { createRecitation, listRecitations } from "@/lib/qa-data";

interface UseRecitationVersionResolverResult {
  versionId: string | null;
  setVersionId: (versionId: string | null) => void;
  resolveVersionId: () => Promise<string | null>;
}

async function resolveVersion(reciterId: string): Promise<string | null> {
  const versions = await listRecitations(reciterId);
  if (versions?.length) {
    return versions[0].id;
  }

  const created = await createRecitation({
    reciterId,
    versionName: "Default",
    versionLabel: "Default",
  });

  return created.id;
}

export function useRecitationVersionResolver(reciterId: string): UseRecitationVersionResolverResult {
  const [versionId, setVersionId] = useState<string | null>(null);

  const resolveVersionId = useCallback(async (): Promise<string | null> => {
    try {
      const resolved = await resolveVersion(reciterId);
      setVersionId(resolved);
      return resolved;
    } catch {
      setVersionId(null);
      return null;
    }
  }, [reciterId]);

  useEffect(() => {
    let cancelled = false;
    void resolveVersion(reciterId)
      .then((resolved) => {
        if (!cancelled) {
          setVersionId(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersionId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reciterId]);

  return {
    versionId,
    setVersionId,
    resolveVersionId,
  };
}
