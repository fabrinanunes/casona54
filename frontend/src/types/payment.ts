import type { PaymentFrequency } from "../constants/frequencyConstants";
import type { PaymentStatus } from "../constants/paymentConstants";

export type Payment = {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  category: string;
  responsible: string;
  status: PaymentStatus;
  paid_at: string;
  frequency: PaymentFrequency;
  is_recurring: boolean;
};

export type PaymentFormData = {
  description: string;
  amount: string | number;
  dueDate: string;
  category: string;
  responsible: string;
  status: PaymentStatus;
  paidAt: string;
  frequency: PaymentFrequency;
  durationMonths: string;
};

export type PaymentPayload = {
  description: string;
  amount: number;
  due_date: string;
  category: string;
  responsible: string;
  status: PaymentFormData["status"];
  paid_at: string;
  frequency: PaymentFrequency;
  duration_months?: number;
};
