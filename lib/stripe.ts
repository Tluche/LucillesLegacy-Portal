import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function stripeServer(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new Stripe(secretKey, {
      apiVersion: "2024-06-20"
    });
  }
  return cachedClient;
}

export function formatCentsToDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const LUCILLES_SERVICES = [
  "Financial Coaching",
  "Life Insurance",
  "Business Insurance",
  "Tax Preparation",
  "Tax Planning",
  "Bookkeeping",
  "Business Credit",
  "Business Funding",
  "LLC Formation",
  "Notary Services",
  "Memberships",
  "Other"
];
