"use client";

/**
 * Lucille's Legacy — Admin summary for a Bookkeeping Onboarding
 * Questionnaire. Fetch the row from `bookkeeping_questionnaires`
 * for the selected client, then render:
 *
 * <AdminBookkeepingSummary
 *   responses={data.responses}
 *   status={data.status}
 *   submittedAt={data.submitted_at}
 *   clientName={client.full_name}
 *   businessName={client.business_name}
 * />
 */

import {
  SECTIONS,
  visibleQuestions,
  isAnswered,
  sectionMissing,
  collectAdminFlags,
  formatAnswer,
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

interface Props {
  responses: Responses;
  status: "in_progress" | "submitted";
  submittedAt?: string | null;
  clientName?: string | null;
  businessName?: string | null;
}

export default function AdminBookkeepingSummary({
  responses,
  status,
  submittedAt,
  clientName,
  businessName,
}: Props) {
  const flags = collectAdminFlags(responses);
  const allMissing = SECTIONS.flatMap((s) =>
    sectionMissing(s, responses).map((q) => ({ section: s.title, q }))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{
          backgroundColor: T.surface,
          border: `1px solid ${T.silverLight}`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: T.purple }}
            >
              Bookkeeping Onboarding Questionnaire
            </p>
            <h1 className="text-xl font-bold" style={{ color: T.ink }}>
              {businessName || "Business"}
              {clientName ? ` — ${clientName}` : ""}
            </h1>
            {submittedAt && (
              <p className="text-sm mt-1" style={{ color: T.ink, opacity: 0.6 }}>
                Submitted {new Date(submittedAt).toLocaleString()}
              </p>
            )}
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={
              status === "submitted"
                ? { backgroundColor: T.purple, color: "#fff" }
                : {
                    backgroundColor: T.silverLight,
                    color: T.purpleDeep,
                    border: `1px solid ${T.silver}`,
                  }
            }
          >
            {status === "submitted" ? "Submitted" : "In progress"}
          </span>
        </div>
      </div>

      {flags.length > 0 && (
        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.purple}` }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-wide mb-3"
            style={{ color: T.purpleDeep }}
          >
            Needs follow-up ({flags.length})
          </h2>
          <ul className="space-y-2">
            {flags.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm" style={{ color: T.ink }}>
                <span aria-hidden="true" style={{ color: T.purple }}>⚑</span>
                <span>
                  <span className="font-semibold">{f.sectionTitle}:</span> {f.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allMissing.length > 0 && (
        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{ backgroundColor: T.silverLight, border: `1px solid ${T.silver}` }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-wide mb-3"
            style={{ color: T.purpleDeep }}
          >
            Missing information ({allMissing.length})
          </h2>
          <ul className="space-y-1.5">
            {allMissing.map(({ section, q }) => (
              <li key={q.id} className="text-sm" style={{ color: T.ink }}>
                <span className="font-semibold">{section}:</span> {q.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {SECTIONS.map((section) => {
        const qs = visibleQuestions(section, responses);
        return (
          <div
            key={section.id}
            className="rounded-2xl p-6 shadow-sm"
            style={{
              backgroundColor: T.surface,
              border: `1px solid ${T.silverLight}`,
            }}
          >
            <h2
              className="text-base font-bold mb-4 pb-3"
              style={{ color: T.ink, borderBottom: `1px solid ${T.silverLight}` }}
            >
              {section.title}
            </h2>
            <dl className="space-y-4">
              {qs.map((q) => {
                const answered = isAnswered(q, responses);
                return (
                  <div key={q.id}>
                    <dt
                      className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                      style={{ color: T.ink, opacity: 0.55 }}
                    >
                      {q.label}
                    </dt>
                    <dd
                      className="text-sm whitespace-pre-wrap"
                      style={
                        answered
                          ? { color: T.ink }
                          : { color: T.purple, fontWeight: 600 }
                      }
                    >
                      {answered
                        ? formatAnswer(q, responses)
                        : q.required
                        ? "— Missing —"
                        : "— Not provided (optional) —"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
