import { apiRequest } from "./api";

import type {
  Payment,
  PaymentFormData,
  PaymentPayload,
} from "../types/payment";

function toPaymentPayload(payment: PaymentFormData): PaymentPayload {
  return {
    description: payment.description,
    amount: Number(payment.amount),
    due_date: payment.dueDate,
    category: payment.category,
    responsible: payment.responsible,
    status: payment.status,
    paid_at: payment.paidAt,
  };
}

export async function getPayments(): Promise<Payment[]> {
  return apiRequest<Payment[]>("/payments");
}

export async function createPayment(
  payment: PaymentFormData,
): Promise<Payment> {
  return apiRequest<Payment>("/payments", {
    method: "POST",
    body: toPaymentPayload(payment),
  });
}

export async function updatePayment(
  id: number,
  payment: PaymentFormData,
): Promise<Payment> {
  return apiRequest<Payment>(
    `/payments/${id}`,
    {
      method: "PUT",
    body: toPaymentPayload(payment),
    },
  );
}

export async function deletePayment(
  id: number,
): Promise<void> {
  await apiRequest<void>(
    `/payments/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function markPaymentAsPaid(id: number): Promise<Payment> {
  return apiRequest<Payment>(`/payments/${id}/pay`, {
    method: "PATCH",
  });
}