"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/lib/workspace-context";
import { StepDots, StepGetStarted, StepHowItWorks, StepWelcome } from "./onboarding/steps";

export default function OnboardingOverlay() {
  const { state, dispatch } = useWorkspace();
  const t = useTranslations("qa.onboarding");
  const prefersReduced = useReducedMotion();
  const reduced = !!prefersReduced;

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [exiting, setExiting] = useState(false);

  const show = state.onboardingCompleted === false;

  const completeOnboarding = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      dispatch({ type: "COMPLETE_ONBOARDING" });
      dispatch({ type: "CREATE_WORKSPACE" });
    }, reduced ? 50 : 400);
  }, [dispatch, reduced]);

  const skipOnboarding = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      dispatch({ type: "COMPLETE_ONBOARDING" });
    }, reduced ? 50 : 400);
  }, [dispatch, reduced]);

  const advance = useCallback(() => {
    setStep((current) => (current < 2 ? ((current + 1) as 0 | 1 | 2) : current));
  }, []);

  useEffect(() => {
    if (!show || exiting) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (step < 2) {
          advance();
        } else {
          completeOnboarding();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        skipOnboarding();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, exiting, step, advance, completeOnboarding, skipOnboarding]);

  if (!show) {
    return null;
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.05 : 0.4 }}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(30,30,40,0.95), rgba(0,0,0,0.98))",
            }}
          />

          <div className="relative flex flex-1 flex-col">
            <AnimatePresence mode="wait">
              {step === 0 && <StepWelcome t={t} onNext={advance} reduced={reduced} />}
              {step === 1 && <StepHowItWorks t={t} onNext={advance} reduced={reduced} />}
              {step === 2 && (
                <StepGetStarted
                  t={t}
                  onComplete={completeOnboarding}
                  onSkip={skipOnboarding}
                  reduced={reduced}
                />
              )}
            </AnimatePresence>

            <StepDots current={step} total={3} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
