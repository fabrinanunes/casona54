export const PaymentFrequency = {
  ONCE: "once",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type PaymentFrequency =
  (typeof PaymentFrequency)[keyof typeof PaymentFrequency];

export const PaymentFrequencyLabel: Record<PaymentFrequency, string> = {
  [PaymentFrequency.ONCE]: "Única",
  [PaymentFrequency.WEEKLY]: "Semanal",
  [PaymentFrequency.MONTHLY]: "Mensal",
  [PaymentFrequency.YEARLY]: "Anual",
};