"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HeroWaveform, ProcessingAnimation, RegionEditorAnimation, WaveformAnimation } from "./animations";

export type OnboardingTranslate = (key: string) => string;

function FeatureCard({
  index,
  icon,
  title,
  description,
  children,
  reduced,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduced ? 0 : index * 0.15,
        duration: reduced ? 0.1 : 0.4,
        ease: "easeOut",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/50">{description}</p>
        </div>
      </div>
      <div className="mt-1">{children}</div>
    </motion.div>
  );
}

export function StepWelcome({
  t,
  onNext,
  reduced,
}: {
  t: OnboardingTranslate;
  onNext: () => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      key="step-0"
      className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: reduced ? 0.1 : 0.4 }}
    >
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px circle at 50% 40%, rgba(255,255,255,0.03), transparent 70%)",
          }}
        />
      )}

      <div className="relative flex flex-col items-center gap-2">
        <motion.h1
          className="text-5xl font-bold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.2, duration: 0.5 }}
        >
          {t("welcome")}
        </motion.h1>
        <motion.p
          className="text-2xl text-white/40"
          style={{ fontFamily: "var(--font-serif)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.35, duration: 0.5 }}
        >
          {t("welcomeAr")}
        </motion.p>
      </div>

      <motion.p
        className="max-w-md text-lg text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.5, duration: 0.5 }}
      >
        {t("tagline")}
      </motion.p>

      <motion.p
        className="max-w-sm text-sm text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.65, duration: 0.5 }}
      >
        {t("subtitle")}
      </motion.p>

      <motion.button
        onClick={onNext}
        className="mt-4 rounded-xl bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.8, duration: 0.4 }}
      >
        {t("getStarted")}
      </motion.button>
    </motion.div>
  );
}

export function StepHowItWorks({
  t,
  onNext,
  reduced,
}: {
  t: OnboardingTranslate;
  onNext: () => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      key="step-1"
      className="flex h-full flex-col items-center justify-center gap-6 px-6"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: reduced ? 0.1 : 0.35 }}
    >
      <div className="flex w-full max-w-lg flex-col gap-4">
        <FeatureCard
          index={0}
          title={t("step1Title")}
          description={t("step1Desc")}
          reduced={reduced}
          icon={
            <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
          }
        >
          <WaveformAnimation reduced={reduced} />
        </FeatureCard>

        <FeatureCard
          index={1}
          title={t("step2Title")}
          description={t("step2Desc")}
          reduced={reduced}
          icon={
            <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
            </svg>
          }
        >
          <ProcessingAnimation reduced={reduced} />
        </FeatureCard>

        <FeatureCard
          index={2}
          title={t("step3Title")}
          description={t("step3Desc")}
          reduced={reduced}
          icon={
            <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          }
        >
          <RegionEditorAnimation reduced={reduced} />
        </FeatureCard>
      </div>

      <motion.button
        onClick={onNext}
        className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.6, duration: 0.3 }}
      >
        {t("continue")}
      </motion.button>
    </motion.div>
  );
}

export function StepGetStarted({
  t,
  onComplete,
  onSkip,
  reduced,
}: {
  t: OnboardingTranslate;
  onComplete: () => void;
  onSkip: () => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      key="step-2"
      className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: reduced ? 0.1 : 0.35 }}
    >
      <HeroWaveform reduced={reduced} />

      <motion.button
        onClick={onComplete}
        className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.5, duration: 0.4 }}
      >
        {t("createFirst")}
      </motion.button>

      <motion.button
        onClick={onSkip}
        className="rounded text-xs text-white/30 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.7, duration: 0.3 }}
      >
        {t("skip")}
      </motion.button>
    </motion.div>
  );
}

export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
            index === current ? "bg-white/80" : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}
