"use client";

/**
 * Lucille's Legacy — Bookkeeping Onboarding Questionnaire (client-facing)
 * Render inside the client dashboard for approved bookkeeping clients:
 *
 * <BookkeepingQuestionnaire
 *   supabase={supabase}
 *   clientProfile={{ id: user.id, name, email, phone, businessName, address }}
 *   onExit={() => setActive("dashboard")}
 * />
 *
 * Colors read portal CSS variables first, brand palette as fallback:
 * --ll-purple, --ll-purple-deep, --ll-silver, --ll-silver-light,
 * --ll-ink, --ll-surface
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SECTIONS,
  WELCOME,
  SUBMITTED,
  DOC_REMINDER_COPY,
  visibleQuestions,
  sectionMissing,
  sectionHasDocReminder,
  type Question,
  type Responses,
} from "./questionnaire-config";

const T = {
  purple: "var(--ll-purple, #5B2A86)",
  purpleDeep: "var(--ll-purple-deep, #3E1C5E)",
  silver: "var(--ll-silver, #C9C9D4)",
  silverLight: "var(--ll-silver-light, #EFEFF4)",
  ink: "var(--ll-ink, #1A1A1E)",
  surface: "var(--ll-surface, #FFFFFF)",
};

export interface ClientProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  businessName?: string | null;
  address?: string | null;
}

interface Props {
  supabase: SupabaseClient;
  clientProfile: ClientProfile;
  onExit?: () => void;
}

type Screen = "loading" | "welcome" | "form" | "submitted";

export default function BookkeepingQuestionnaire({
  supabase,
  clientProfile,
  onExit,
}: Props) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Responses>({});
  const [rowId, setRowId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const section = SECTIONS[step];
  const totalSteps = SECTIONS.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookkeeping_questionnaires")
        .select("id, status, current_step, responses")
        .eq("client_id", clientProfile.id)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setRowId(data.id);
        if (data.status === "submitted") {
          setScreen("submitted");
          return;
        }
        const loaded: Responses = data.responses ?? {};
        setResponses(applyPrefills(loaded, clientProfile));
        setStep(Math.min(data.current_step ?? 0, totalSteps - 1));
        const hasProgress = Object.keys(loaded).length > 0;
        setScreen(hasProgress ? "form" : "welcome");
      } else {
        setResponses(applyPrefills({}, clientProfile));
        setScreen("welcome");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientProfile.id]);

  const persist = useCallback(
    async (next: Responses, currentStep: number) => {
      setSaveState("saving");
      if (rowId) {
        await supabase
          .from("bookkeeping_questionnaires")
          .update({ responses: next, current_step: currentStep })
          .eq("id", rowId);
      } else {
        const { data } = await supabase
          .from("bookkeeping_questionnaires")
          .insert({
            client_id: clientProfile.id,
            responses: next,
            current_step: currentStep,
          })
          .select("id")
          .single();
        if (data) setRowId(data.id);
      }
      setSaveState("saved");
    },
    [rowId, supabase, clientProfile.id]
  );

  const queueSave = useCallback(
    (next: Responses, currentStep: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next, currentStep), 800);
    },
    [persist]
  );

  const setAnswer = (id: string, value: string | string[]) => {
    setResponses((prev) => {
      const next = { ...prev, [id]: value };
      queueSave(next, step);
      return next;
    });
  };

  const missing = useMemo(
    () => (section ? sectionMissing(section, responses) : []),
    [section, responses]
  );

  const scrollTop = () =>
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const goNext = async () => {
    if (missing.length > 0) {
      setShowErrors(true);
      scrollTop();
      return;
    }
    setShowErrors(false);
    if (step < totalSteps - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      persist(responses, nextStep);
      scrollTop();
    } else {
      await submit();
    }
  };

  const goBack = () => {
    setShowErrors(false);
    const prevStep = Math.max(0, step - 1);
    setStep(prevStep);
    persist(responses, prevStep);
    scrollTop();
  };

  const saveAndExit = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist(responses, step);
    onExit?.();
  };

  const submit = async () => {
    setSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist(responses, step);
    if (rowId) {
      await supabase
        .from("bookkeeping_questionnaires")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", rowId);
    }
    setSubmitting(false);
    setScreen("submitted");
  };

  if (screen === "loading") {
    return (
      <Card>
        <p className="text-sm" style={{ color: T.ink, opacity: 0.6 }}>
          Loading your questionnaire…
        </p>
      </Card>
    );
  }

  if (screen === "welcome") {
    return (
      <Card>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: T.purple }}
        >
          Bookkeeping Onboarding
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: T.ink }}>
          {WELCOME.title}
        </h1>
        <p className="mb-3 leading-relaxed" style={{ color: T.ink }}>
          {WELCOME.body}
        </p>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: T.ink, opacity: 0.7 }}>
          {WELCOME.note}
        </p>
        <PrimaryButton onClick={() => setScreen("form")}>
          {WELCOME.button}
        </PrimaryButton>
      </Card>
    );
  }

  if (screen === "submitted") {
    return (
      <Card>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: T.purple }}
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4" style={{ color: T.ink }}>
          {SUBMITTED.title}
        </h1>
        {SUBMITTED.lines.map((line) => (
          <p key={line} className="mb-2 leading-relaxed" style={{ color: T.ink }}>
            {line}
          </p>
        ))}
        {onExit && (
          <div className="mt-8">
            <PrimaryButton onClick={onExit}>Back to my dashboard</PrimaryButton>
          </div>
        )}
      </Card>
    );
  }

  const percent = Math.round(((step + 1) / totalSteps) * 100);
  const showDocReminder = sectionHasDocReminder(section, responses);

  return (
    <div ref={topRef} className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: T.purple }}
          >
            Step {step + 1} of {totalSteps} — {section.title}
          </p>
          <p
            className="text-xs tabular-nums"
            style={{ color: T.ink, opacity: 0.55 }}
            aria-live="polite"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
              ? "Saved"
              : `${percent}%`}
          </p>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: T.silverLight }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Questionnaire progress"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%`, backgroundColor: T.purple }}
          />
        </div>
      </div>

      <Card>
        <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: T.ink }}>
          {section.title}
        </h2>
        <p
          className="mb-6 text-sm md:text-base leading-relaxed"
          style={{ color: T.ink, opacity: 0.75 }}
        >
          {section.intro}
        </p>

        {showErrors && missing.length > 0 && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: T.silverLight,
              color: T.purpleDeep,
              border: `1px solid ${T.silver}`,
            }}
            role="alert"
          >
            Almost there — just a few answers left on this step before we move on.
          </div>
        )}

        <div className="space-y-6">
          {visibleQuestions(section, responses).map((q) => (
            <Field
              key={q.id}
              q={q}
              responses={responses}
              setAnswer={setAnswer}
              showError={showErrors && missing.some((m) => m.id === q.id)}
            />
          ))}
        </div>

        {showDocReminder && (
          <div
            className="mt-6 rounded-lg px-4 py-3 text-sm leading-relaxed flex gap-3"
            style={{
              backgroundColor: T.silverLight,
              border: `1px solid ${T.silver}`,
              color: T.ink,
            }}
          >
            <span aria-hidden="true" style={{ color: T.purple }}>●</span>
            <span>{DOC_REMINDER_COPY}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={saveAndExit}
            className="text-sm underline underline-offset-4 py-2 text-left"
            style={{ color: T.ink, opacity: 0.65 }}
          >
            Save &amp; finish later
          </button>
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="px-5 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: T.surface,
                  color: T.purpleDeep,
                  border: `1px solid ${T.silver}`,
                  outlineColor: T.purple,
                }}
              >
                Back
              </button>
            )}
            <PrimaryButton onClick={goNext} disabled={submitting}>
              {submitting
                ? "Submitting…"
                : step === totalSteps - 1
                ? "Submit questionnaire"
                : "Continue"}
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl mx-auto"
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.silverLight}`,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ backgroundColor: T.purple, outlineColor: T.purpleDeep }}
    >
      {children}
    </button>
  );
}

function Field({
  q,
  responses,
  setAnswer,
  showError,
}: {
  q: Question;
  responses: Responses;
  setAnswer: (id: string, v: string | string[]) => void;
  showError: boolean;
}) {
  const value = responses[q.id];
  const labelId = `q-${q.id}`;

  const inputBase =
    "w-full rounded-lg px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 transition-shadow";
  const inputStyle: React.CSSProperties = {
    backgroundColor: T.surface,
    border: `1px solid ${showError ? T.purple : T.silver}`,
    color: T.ink,
  };

  return (
    <div>
      <label
        id={labelId}
        htmlFor={
          q.type === "text" || q.type === "textarea" || q.type === "select"
            ? `input-${q.id}`
            : undefined
        }
        className="block font-semibold mb-1 text-sm md:text-base"
        style={{ color: T.ink }}
      >
        {q.label}
        {!q.required && (
          <span
            className="ml-2 text-xs font-normal"
            style={{ color: T.ink, opacity: 0.5 }}
          >
            (optional)
          </span>
        )}
      </label>
      {q.hint && (
        <p
          className="text-xs md:text-sm mb-2 leading-relaxed"
          style={{ color: T.ink, opacity: 0.6 }}
        >
          {q.hint}
        </p>
      )}

      {q.type === "text" && (
        <input
          id={`input-${q.id}`}
          type="text"
          className={inputBase}
          style={inputStyle}
          placeholder={q.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
      )}

      {q.type === "textarea" && (
        <textarea
          id={`input-${q.id}`}
          rows={3}
          className={inputBase}
          style={inputStyle}
          placeholder={q.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
      )}

      {q.type === "select" && (
        <select
          id={`input-${q.id}`}
          className={inputBase}
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        >
          <option value="" disabled>
            Choose one…
          </option>
          {q.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {q.type === "radio" && (
        <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2">
          {q.options?.map((o) => {
            const selected = value === o.value;
            return (
              <label
                key={o.value}
                className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                style={{
                  border: `1px solid ${selected ? T.purple : T.silver}`,
                  backgroundColor: selected ? T.silverLight : T.surface,
                }}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={o.value}
                  checked={selected}
                  onChange={() => setAnswer(q.id, o.value)}
                  className="mt-0.5 accent-current"
                  style={{ color: T.purple }}
                />
                <span className="text-sm md:text-base" style={{ color: T.ink }}>
                  {o.label}
                  {o.hint && (
                    <span className="block text-xs mt-0.5" style={{ opacity: 0.6 }}>
                      {o.hint}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === "multiselect" && (
        <div role="group" aria-labelledby={labelId} className="grid gap-2">
          {q.options?.map((o) => {
            const arr = (value as string[]) ?? [];
            const selected = arr.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                style={{
                  border: `1px solid ${selected ? T.purple : T.silver}`,
                  backgroundColor: selected ? T.silverLight : T.surface,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    setAnswer(
                      q.id,
                      selected
                        ? arr.filter((v) => v !== o.value)
                        : [...arr, o.value]
                    )
                  }
                  className="mt-0.5 accent-current"
                  style={{ color: T.purple }}
                />
                <span className="text-sm md:text-base" style={{ color: T.ink }}>
                  {o.label}
                  {o.hint && (
                    <span className="block text-xs mt-0.5" style={{ opacity: 0.6 }}>
                      {o.hint}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {showError && (
        <p className="mt-1.5 text-xs font-medium" style={{ color: T.purple }}>
          We'll need this one before we continue.
        </p>
      )}
    </div>
  );
}

function applyPrefills(existing: Responses, profile: ClientProfile): Responses {
  const next = { ...existing };
  for (const section of SECTIONS) {
    for (const q of section.questions) {
      if (q.prefillFrom && !next[q.id]) {
        const v = profile[q.prefillFrom];
        if (v) next[q.id] = v;
      }
    }
  }
  return next;
}
