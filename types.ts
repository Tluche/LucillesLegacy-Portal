import type {
  Appointment,
  ClientProfile,
  Invoice,
  Message,
  Notification,
  PortalDocument,
  Resource,
  ServiceTracker
} from "./types";

export const clientProfile: ClientProfile = {
  id: "client-001",
  name: "Avery Johnson",
  email: "avery.johnson@example.com",
  phone: "(555) 214-9087",
  address: "1400 Legacy Lane, Dallas, TX 75201",
  emergencyContact: "Morgan Johnson - (555) 440-8812",
  preferredContact: "Email",
  role: "client"
};

export const adminProfile: ClientProfile = {
  id: "admin-001",
  name: "Lucille's Legacy Admin",
  email: "admin@lucilleslegacy.com",
  phone: "(555) 315-1100",
  address: "Business Office",
  emergencyContact: "Not needed",
  preferredContact: "Email",
  role: "admin"
};

export const clients: ClientProfile[] = [
  clientProfile,
  {
    id: "client-002",
    name: "Maria Thompson",
    email: "maria@example.com",
    phone: "(555) 827-1931",
    address: "221 Silver Street, Plano, TX 75024",
    emergencyContact: "Dee Thompson - (555) 290-1109",
    preferredContact: "Text",
    role: "client"
  },
  {
    id: "client-003",
    name: "Robert Ellis",
    email: "robert@example.com",
    phone: "(555) 901-3382",
    address: "78 Finance Way, Frisco, TX 75034",
    emergencyContact: "Jordan Ellis - (555) 112-8842",
    preferredContact: "Phone",
    role: "client"
  }
];

export const serviceTrackers: ServiceTracker[] = [
  {
    key: "tax",
    name: "Tax Preparation",
    currentStage: "Return Being Prepared",
    progress: 43,
    lastUpdated: "July 2, 2026",
    adminNotes: "W-2 and bank interest forms are received. Waiting on childcare receipts.",
    nextStep: "Upload childcare receipts so your return can move to review.",
    stages: [
      "Intake Complete",
      "Documents Received",
      "Return Being Prepared",
      "Client Review",
      "Filed",
      "IRS Accepted",
      "Refund Issued"
    ]
  },
  {
    key: "credit",
    name: "Credit Support",
    currentStage: "Strategy Built",
    progress: 38,
    lastUpdated: "June 28, 2026",
    adminNotes: "Reports reviewed and first action plan is ready.",
    nextStep: "Review your strategy notes and confirm your mailing address.",
    stages: [
      "Consultation",
      "Credit Reports Reviewed",
      "Strategy Built",
      "Disputes Submitted",
      "Responses Received",
      "Round 2",
      "Monitoring",
      "Goal Achieved"
    ]
  },
  {
    key: "bookkeeping",
    name: "Bookkeeping",
    currentStage: "Categorizing Transactions",
    progress: 50,
    lastUpdated: "July 1, 2026",
    adminNotes: "June bank feed is connected. A few expense categories need confirmation.",
    nextStep: "Answer the three category questions in Messages.",
    stages: [
      "Onboarding",
      "Bank Accounts Connected",
      "Categorizing Transactions",
      "Reconciliation",
      "Financial Reports",
      "Monthly Review"
    ]
  },
  {
    key: "life-insurance",
    name: "Life Insurance",
    currentStage: "Needs Analysis",
    progress: 33,
    lastUpdated: "June 24, 2026",
    adminNotes: "Initial consultation is complete and coverage goals are listed.",
    nextStep: "Confirm beneficiary details before the application is prepared.",
    stages: [
      "Consultation",
      "Needs Analysis",
      "Application Submitted",
      "Underwriting",
      "Approval",
      "Policy Issued"
    ]
  }
];

export const documents: PortalDocument[] = [
  { id: "doc-1", name: "2025 W-2.pdf", uploadedAt: "July 1, 2026", category: "Tax", status: "Received" },
  { id: "doc-2", name: "Credit report authorization.pdf", uploadedAt: "June 27, 2026", category: "Credit", status: "Reviewing" },
  { id: "doc-3", name: "June bank statement.pdf", uploadedAt: "July 2, 2026", category: "Bookkeeping", status: "Received" },
  { id: "doc-4", name: "Beneficiary worksheet.pdf", uploadedAt: "June 24, 2026", category: "Life Insurance", status: "Needs update" }
];

export const messages: Message[] = [
  {
    id: "msg-1",
    sender: "admin",
    preview: "Please upload childcare receipts when you have a moment.",
    body: "Please upload childcare receipts when you have a moment. That is the last item needed before your return moves to client review.",
    timestamp: "Today, 9:42 AM",
    unread: true
  },
  {
    id: "msg-2",
    sender: "client",
    preview: "I can send those tonight.",
    body: "I can send those tonight. Thank you for the update.",
    timestamp: "Today, 10:04 AM"
  },
  {
    id: "msg-3",
    sender: "admin",
    preview: "Your bookkeeping review is scheduled for Friday.",
    body: "Your bookkeeping review is scheduled for Friday. We will review June reports and open category questions.",
    timestamp: "Yesterday, 4:18 PM"
  }
];

export const appointments: Appointment[] = [
  { id: "appt-1", title: "Tax review call", date: "July 12, 2026", time: "2:00 PM", status: "Upcoming" },
  { id: "appt-2", title: "Bookkeeping monthly review", date: "July 17, 2026", time: "11:30 AM", status: "Upcoming" },
  { id: "appt-3", title: "Credit consultation", date: "June 22, 2026", time: "1:00 PM", status: "Past" }
];

export const invoices: Invoice[] = [
  { id: "inv-1042", label: "Invoice #1042 - Tax preparation", amount: "$425.00", dueDate: "July 15, 2026", status: "Due" },
  { id: "inv-1039", label: "Invoice #1039 - Bookkeeping", amount: "$250.00", dueDate: "July 20, 2026", status: "Scheduled" },
  { id: "inv-1028", label: "Invoice #1028 - Credit consultation", amount: "$150.00", dueDate: "June 22, 2026", status: "Paid" }
];

export const notifications: Notification[] = [
  { id: "note-1", kind: "Document received", title: "Document received", text: "Your W-2 was received and added to your tax file." },
  { id: "note-2", kind: "New message", title: "New message", text: "Lucille's Legacy sent you a new document request." },
  { id: "note-3", kind: "Appointment reminder", title: "Upcoming appointment", text: "Tax review call is scheduled for July 12 at 2:00 PM." },
  { id: "note-4", kind: "Status updated", title: "Status updated", text: "Your tax service moved to Return Being Prepared." },
  { id: "note-5", kind: "Payment received", title: "Payment received", text: "Your last payment was marked paid. Thank you." }
];

export const resources: Resource[] = [
  { id: "res-1", title: "Budget Planner", description: "A simple monthly planner for income, bills, savings, and goals." },
  { id: "res-2", title: "Goal Tracker", description: "Track financial goals and the next action needed for each one." },
  { id: "res-3", title: "Credit Education Guide", description: "Plain-language tips for reading reports and building stronger credit habits." },
  { id: "res-4", title: "Tax Checklist", description: "A seasonal checklist to help you gather common tax documents." },
  { id: "res-5", title: "Receipt Tracker", description: "A clean worksheet for business and tax-related receipts." },
  { id: "res-6", title: "Insurance Checklist", description: "Questions to prepare before choosing a life insurance policy." }
];
