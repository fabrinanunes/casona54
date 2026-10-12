import type { PaymentStatus } from "../constants/paymentConstants";

export type Payment = {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  category: string;
  responsible: string;
  status: PaymentStatus;
};

export type PaymentFormData = {
  description: string;
  amount: string | number;
  dueDate: string;
  category: string;
  responsible: string;
  status: PaymentStatus;
};