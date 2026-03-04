"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/lib/workspace-context";

export default function EmptyStateView() {
  const t = useTranslations("qa.workspace");
  const { dispatch } = useWorkspace();

  return (
    <div className="flex items-center justify-center min-h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-4"
      >
        <div className="mx-auto w-16 h-16 bg-white/[0.1] backdrop-blur-md border border-white/[0.12] rounded-xl flex items-center justify-center">
          <Plus className="w-7 h-7 text-white/30" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white/70">{t("emptyTitle")}</h3>
          <p className="text-sm text-white/30 mt-1">{t("emptyDescription")}</p>
        </div>
        <button
          onClick={() => dispatch({ type: "CREATE_WORKSPACE" })}
          className="px-5 py-2.5 bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors app-no-drag rounded-xl"
        >
          {t("createFirst")}
        </button>
      </motion.div>
    </div>
  );
}
