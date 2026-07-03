export type UserRole = "client" | "admin";

export type ServiceKey = "tax" | "credit" | "bookkeeping" | "life-insurance";

export type DocumentCategory = "Tax" | "Credit" | "Bookkeeping" | "Life Insurance" | "General";

export type ServiceTracker = {
  key: ServiceKey;
  name: string;
  currentStage: string;
  progress: number;
  lastUpdated: string;
  adminNotes: string;
  nextStep: string;
  stages: string[];
};

export type ClientProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  preferredContact: "Email" | "Phone" | "Text";
  role: UserRole;
};

export type PortalDocument = {
  id: string;
  name: string;
  uploadedAt: string;
  category: DocumentCategory;
  status: "Received" | "Reviewing" | "Needs update";
};

export type Message = {
  id: string;
  sender: "client" | "admin";
  preview: string;
  body: string;
  timestamp: string;
  unread?: boolean;
};

export type Appointment = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: "Upcoming" | "Past";
};

export type Invoice = {
  id: string;
  label: string;
  amount: string;
  dueDate: string;
  status: "Due" | "Paid" | "Scheduled";
};

export type Notification = {
  id: string;
  title: string;
  text: string;
  kind: "Document received" | "New message" | "Appointment reminder" | "Status updated" | "Payment received";
};

export type Resource = {
  id: string;
  title: string;
  description: string;
};
