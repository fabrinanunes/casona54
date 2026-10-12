export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
} as const;

export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentStatusLabel: Record<
  PaymentStatus,
  string
> = {
  [PaymentStatus.PENDING]: "Pendente",
  [PaymentStatus.PAID]: "Pago",
};