/**
 * Lucille's Legacy — Bookkeeping Onboarding Questionnaire
 * Single source of truth for every section, question, copy,
 * conditional rule, document reminder, and admin follow-up flag.
 * To change wording, options, or logic, edit THIS file only.
 */

export type Responses = Record<string, string | string[] | undefined>;

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "multiselect";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string; hint?: string }[];
  required?: boolean;
  showIf?: (r: Responses) => boolean;
  prefillFrom?: "businessName" | "name" | "email" | "phone" | "address";
  docReminderIf?: (r: Responses) => boolean;
  flagIf?: (r: Responses) => string | null;
}

export interface Section {
  id: string;
  title: string;
  intro: string;
  questions: Question[];
}

export const DOC_REMINDER_COPY =
  "Heads up — based on your answer, we may request additional documentation through your secure client portal after reviewing your questionnaire. Nothing to do right now!";

export const WELCOME = {
  title: "Let's get your books set up right",
  body: "Welcome to bookkeeping with Lucille's Legacy! This short questionnaire helps us understand your business so we can hit the ground running. It usually takes about 10 minutes, and your answers save automatically — so if life happens, just come back and pick up where you left off.",
  note: "We've already filled in what we know about you, so you won't have to repeat yourself.",
  button: "Let's get started",
};

export const SUBMITTED = {
  title: "Thank you!",
  lines: [
    "We've received your Bookkeeping Onboarding Questionnaire.",
    "Our team will review your information and begin preparing your file.",
    "If we need anything else, we'll send you a secure message through your client portal.",
  ],
};

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
export const SECTIONS: Section[] = [
  {
    id: "business_overview",
    title: "Your Business",
    intro:
      "First, tell us a little about your business — the basics, in your own words.",
    questions: [
      {
        id: "business_name",
        type: "text",
        label: "Business name",
        hint: "We pulled this from your profile — just double-check it looks right.",
        prefillFrom: "businessName",
        required: true,
      },
      {
        id: "entity_type",
        type: "select",
        label: "How is your business set up?",
        hint: "If you're not sure, pick \"Not sure\" — we'll help you figure it out.",
        required: true,
        options: [
          { value: "sole_prop", label: "Sole proprietor (just me, no LLC)" },
          { value: "llc_single", label: "LLC — just me" },
          { value: "llc_multi", label: "LLC — with partners" },
          { value: "s_corp", label: "S-Corporation" },
          { value: "c_corp", label: "C-Corporation" },
          { value: "partnership", label: "Partnership" },
          { value: "nonprofit", label: "Nonprofit" },
          { value: "not_sure", label: "Not sure" },
        ],
        flagIf: (r) =>
          r.entity_type === "not_sure"
            ? "Client is unsure of their entity type — confirm before setup."
            : null,
      },
      {
        id: "industry",
        type: "text",
        label: "What industry are you in?",
        placeholder: "e.g., hair care, trucking, consulting, e-commerce",
        required: true,
      },
      {
        id: "business_description",
        type: "textarea",
        label: "Describe what your business does",
        hint: "One or two sentences is perfect — how would you explain it to a friend?",
        required: true,
      },
      {
        id: "years_in_business",
        type: "select",
        label: "How long have you been in business?",
        required: true,
        options: [
          { value: "lt1", label: "Less than a year" },
          { value: "1-2", label: "1–2 years" },
          { value: "3-5", label: "3–5 years" },
          { value: "6-10", label: "6–10 years" },
          { value: "10+", label: "More than 10 years" },
        ],
      },
    ],
  },
  {
    id: "current_bookkeeping",
    title: "Where Your Books Are Today",
    intro:
      "No judgment here — whether your books are spotless or living in a shoebox, we just need to know the starting point.",
    questions: [
      {
        id: "keeps_books",
        type: "radio",
        label: "Are you currently keeping your books?",
        required: true,
        options: [
          { value: "yes_regular", label: "Yes, regularly" },
          { value: "sometimes", label: "Sort of — when I can get to it" },
          { value: "no", label: "Not really" },
        ],
        docReminderIf: (r) =>
          r.keeps_books === "sometimes" || r.keeps_books === "no",
      },
      {
        id: "books_manager",
        type: "radio",
        label: "Who handles your books right now?",
        required: true,
        showIf: (r) =>
          r.keeps_books === "yes_regular" || r.keeps_books === "sometimes",
        options: [
          { value: "me", label: "I do it myself" },
          { value: "family_friend", label: "A family member or friend" },
          { value: "bookkeeper", label: "A bookkeeper" },
          { value: "accountant", label: "My accountant / CPA" },
          { value: "other", label: "Someone else" },
        ],
        flagIf: (r) =>
          r.books_manager === "bookkeeper" || r.books_manager === "accountant"
            ? "Client has an existing bookkeeper/accountant — coordinate handoff and access."
            : null,
      },
      {
        id: "accounting_software",
        type: "radio",
        label: "What are you using to track your money?",
        required: true,
        options: [
          { value: "qbo", label: "QuickBooks Online" },
          { value: "qbd", label: "QuickBooks Desktop" },
          { value: "wave", label: "Wave" },
          { value: "xero", label: "Xero" },
          { value: "freshbooks", label: "FreshBooks" },
          { value: "spreadsheets", label: "Spreadsheets" },
          { value: "paper_none", label: "Paper, apps, or nothing formal yet" },
          { value: "other", label: "Something else" },
        ],
      },
      {
        id: "software_other",
        type: "text",
        label: "What software is that?",
        required: true,
        showIf: (r) => r.accounting_software === "other",
      },
      {
        id: "software_setup_help",
        type: "radio",
        label: "Would you like our help getting set up on accounting software?",
        hint: "We'll recommend what fits your business and handle the setup.",
        required: true,
        showIf: (r) =>
          r.accounting_software === "spreadsheets" ||
          r.accounting_software === "paper_none" ||
          r.accounting_software === "other",
        options: [
          { value: "yes", label: "Yes, please!" },
          { value: "no", label: "No, I'm good" },
          { value: "not_sure", label: "Not sure — let's talk about it" },
        ],
        flagIf: (r) =>
          r.software_setup_help === "yes" || r.software_setup_help === "not_sure"
            ? "Client may need software setup — discuss recommendations."
            : null,
      },
    ],
  },
  {
    id: "financial_accounts",
    title: "Your Accounts",
    intro:
      "Now let's map out where your business money lives. Just names for now — no account numbers, and no documents needed yet.",
    questions: [
      {
        id: "bank_account_count",
        type: "radio",
        label: "How many business bank accounts do you have?",
        required: true,
        options: [
          { value: "0", label: "None yet — I use a personal account" },
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3+", label: "3 or more" },
        ],
        flagIf: (r) =>
          r.bank_account_count === "0"
            ? "Client is using a personal account for business — discuss opening a business account and separating funds."
            : null,
        docReminderIf: (r) =>
          !!r.bank_account_count && r.bank_account_count !== "0",
      },
      {
        id: "bank_names",
        type: "text",
        label: "Which bank(s)?",
        placeholder: "e.g., Chase business checking, Navy Federal savings",
        required: true,
        showIf: (r) => !!r.bank_account_count && r.bank_account_count !== "0",
      },
      {
        id: "has_credit_cards",
        type: "radio",
        label: "Do you have business credit cards?",
        required: true,
        options: yesNo,
      },
      {
        id: "credit_card_names",
        type: "text",
        label: "Which card(s)?",
        placeholder: "e.g., Amex Business, Capital One Spark",
        required: true,
        showIf: (r) => r.has_credit_cards === "yes",
      },
      {
        id: "has_loans",
        type: "radio",
        label: "Any business loans or lines of credit?",
        hint: "Include SBA loans, equipment financing, or money you've loaned the business yourself.",
        required: true,
        options: yesNo,
        docReminderIf: (r) => r.has_loans === "yes",
      },
      {
        id: "loan_details",
        type: "textarea",
        label: "Tell us a little about them",
        placeholder: "e.g., SBA loan from 2024, equipment loan for my truck",
        required: true,
        showIf: (r) => r.has_loans === "yes",
        flagIf: (r) =>
          r.has_loans === "yes"
            ? "Client has loans — request statements and confirm balances during setup."
            : null,
      },
      {
        id: "merchant_processors",
        type: "multiselect",
        label: "How do customers pay you?",
        hint: "Select everything you use.",
        required: true,
        options: [
          { value: "square", label: "Square" },
          { value: "stripe", label: "Stripe" },
          { value: "paypal", label: "PayPal / Venmo" },
          { value: "cashapp", label: "Cash App" },
          { value: "zelle", label: "Zelle" },
          { value: "shopify", label: "Shopify" },
          { value: "clover", label: "Clover" },
          { value: "invoices", label: "Invoices / checks / bank transfer" },
          { value: "other", label: "Something else" },
        ],
      },
      {
        id: "handles_cash",
        type: "radio",
        label: "Do you take cash payments?",
        required: true,
        options: yesNo,
        docReminderIf: (r) => r.handles_cash === "yes",
        flagIf: (r) =>
          r.handles_cash === "yes"
            ? "Client handles cash — discuss cash-tracking process."
            : null,
      },
    ],
  },
  {
    id: "payroll",
    title: "Your Team & Payroll",
    intro: "Whether it's just you or a whole squad, let's talk about who gets paid.",
    questions: [
      {
        id: "team_type",
        type: "radio",
        label: "Who works in your business?",
        required: true,
        options: [
          { value: "just_me", label: "Just me" },
          { value: "contractors", label: "Me plus contractors (1099)" },
          { value: "employees", label: "W-2 employees" },
          { value: "both", label: "Both contractors and W-2 employees" },
        ],
      },
      {
        id: "payroll_provider",
        type: "radio",
        label: "How do you run payroll?",
        required: true,
        showIf: (r) => r.team_type === "employees" || r.team_type === "both",
        options: [
          { value: "gusto", label: "Gusto" },
          { value: "adp", label: "ADP" },
          { value: "paychex", label: "Paychex" },
          { value: "quickbooks", label: "QuickBooks Payroll" },
          { value: "manual", label: "I do it myself manually" },
          { value: "none", label: "I don't have a system yet" },
          { value: "other", label: "Something else" },
        ],
        flagIf: (r) =>
          r.payroll_provider === "manual" || r.payroll_provider === "none"
            ? "Client runs payroll manually or has no system — potential payroll support opportunity."
            : null,
      },
      {
        id: "payroll_frequency",
        type: "radio",
        label: "How often does your team get paid?",
        required: true,
        showIf: (r) => r.team_type === "employees" || r.team_type === "both",
        options: [
          { value: "weekly", label: "Weekly" },
          { value: "biweekly", label: "Every two weeks" },
          { value: "semimonthly", label: "Twice a month" },
          { value: "monthly", label: "Monthly" },
          { value: "varies", label: "It varies" },
        ],
      },
    ],
  },
  {
    id: "sales_tax",
    title: "Sales Tax",
    intro:
      "Sales tax trips a lot of business owners up — that's exactly why we ask. If you're not sure about something here, that's a perfectly good answer.",
    questions: [
      {
        id: "collects_sales_tax",
        type: "radio",
        label: "Do you collect sales tax from customers?",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "I'm not sure if I should be" },
        ],
        flagIf: (r) =>
          r.collects_sales_tax === "not_sure"
            ? "Client unsure about sales tax obligations — review nexus and requirements."
            : null,
      },
      {
        id: "sales_tax_states",
        type: "text",
        label: "Which state(s) do you collect in?",
        placeholder: "e.g., Colorado, Texas",
        required: true,
        showIf: (r) => r.collects_sales_tax === "yes",
        flagIf: (r) => {
          const s = (r.sales_tax_states as string) || "";
          return s.includes(",")
            ? "Client collects sales tax in multiple states — confirm registrations and filing calendar."
            : null;
        },
      },
      {
        id: "sales_tax_frequency",
        type: "radio",
        label: "How often do you file?",
        required: true,
        showIf: (r) => r.collects_sales_tax === "yes",
        options: [
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "annually", label: "Annually" },
          { value: "not_sure", label: "Not sure" },
        ],
        flagIf: (r) =>
          r.sales_tax_frequency === "not_sure"
            ? "Client unsure of sales tax filing frequency — verify with state."
            : null,
      },
    ],
  },
  {
    id: "requested_services",
    title: "What You Need From Us",
    intro:
      "Check everything you'd like help with. Not sure what something means? The little descriptions have you covered.",
    questions: [
      {
        id: "services",
        type: "multiselect",
        label: "Which services are you looking for?",
        required: true,
        options: [
          { value: "monthly", label: "Monthly bookkeeping", hint: "We keep your books current every month" },
          { value: "catch_up", label: "Catch-up bookkeeping", hint: "Your books are behind and need to be brought current" },
          { value: "clean_up", label: "Clean-up bookkeeping", hint: "Your books exist but need fixing and organizing" },
          { value: "reconciliation", label: "Reconciliation", hint: "Matching your books to your bank statements" },
          { value: "statements", label: "Financial statements", hint: "Profit & loss, balance sheet, cash flow reports" },
          { value: "ap", label: "Accounts payable", hint: "Managing the bills your business owes" },
          { value: "ar", label: "Accounts receivable", hint: "Tracking what customers owe you" },
          { value: "payroll_support", label: "Payroll support", hint: "Help running or managing payroll" },
          { value: "other", label: "Something else" },
        ],
        docReminderIf: (r) => {
          const s = (r.services as string[]) || [];
          return s.includes("catch_up") || s.includes("clean_up");
        },
        flagIf: (r) => {
          const s = (r.services as string[]) || [];
          return s.includes("catch_up") || s.includes("clean_up")
            ? "Catch-up/clean-up requested — scope the backlog before quoting."
            : null;
        },
      },
      {
        id: "services_other",
        type: "text",
        label: "Tell us what else you need",
        required: true,
        showIf: (r) => ((r.services as string[]) || []).includes("other"),
      },
      {
        id: "behind_since",
        type: "select",
        label: "How far back do your books need attention?",
        hint: "Your best guess is fine — we'll confirm together.",
        required: true,
        showIf: (r) => {
          const s = (r.services as string[]) || [];
          return s.includes("catch_up") || s.includes("clean_up");
        },
        options: [
          { value: "months_1_3", label: "1–3 months" },
          { value: "months_4_6", label: "4–6 months" },
          { value: "months_7_12", label: "7–12 months" },
          { value: "years_1_2", label: "1–2 years" },
          { value: "years_2plus", label: "More than 2 years" },
          { value: "not_sure", label: "Honestly, not sure" },
        ],
      },
    ],
  },
  {
    id: "business_goals",
    title: "Your Goals",
    intro:
      "This is our favorite part. Bookkeeping isn't just about numbers — it's about where you're headed. Talk to us.",
    questions: [
      {
        id: "biggest_challenge",
        type: "textarea",
        label: "What's your biggest bookkeeping challenge right now?",
        placeholder: "e.g., I never know how much I actually made each month",
        required: true,
      },
      {
        id: "primary_goals",
        type: "textarea",
        label: "What are your main goals for the business?",
        placeholder: "e.g., grow to six figures, hire my first employee, buy a building",
        required: true,
      },
      {
        id: "success_looks_like",
        type: "textarea",
        label: "A year from now, what would make you say this was worth it?",
        required: true,
      },
    ],
  },
  {
    id: "additional_info",
    title: "Anything Else?",
    intro: "The floor is yours.",
    questions: [
      {
        id: "anything_else",
        type: "textarea",
        label: "Anything else we should know about you or your business?",
        hint: "Totally optional — but we read every word.",
        required: false,
      },
    ],
  },
];

export function visibleQuestions(section: Section, r: Responses): Question[] {
  return section.questions.filter((q) => !q.showIf || q.showIf(r));
}

export function isAnswered(q: Question, r: Responses): boolean {
  const v = r[q.id];
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim().length > 0;
}

export function sectionMissing(section: Section, r: Responses): Question[] {
  return visibleQuestions(section, r).filter(
    (q) => q.required && !isAnswered(q, r)
  );
}

export function sectionHasDocReminder(section: Section, r: Responses): boolean {
  return visibleQuestions(section, r).some(
    (q) => q.docReminderIf && q.docReminderIf(r)
  );
}

export interface AdminFlag {
  sectionTitle: string;
  questionLabel: string;
  note: string;
}

export function collectAdminFlags(r: Responses): AdminFlag[] {
  const flags: AdminFlag[] = [];
  for (const section of SECTIONS) {
    for (const q of visibleQuestions(section, r)) {
      const note = q.flagIf ? q.flagIf(r) : null;
      if (note) {
        flags.push({ sectionTitle: section.title, questionLabel: q.label, note });
      }
    }
  }
  return flags;
}

export function optionLabel(q: Question, value: string): string {
  return q.options?.find((o) => o.value === value)?.label ?? value;
}

export function formatAnswer(q: Question, r: Responses): string {
  const v = r[q.id];
  if (v === undefined || (Array.isArray(v) && v.length === 0) || v === "")
    return "";
  if (Array.isArray(v)) return v.map((x) => optionLabel(q, x)).join(", ");
  if (q.type === "select" || q.type === "radio")
    return optionLabel(q, String(v));
  return String(v);
}
