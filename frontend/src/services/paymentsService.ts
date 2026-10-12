import { apiRequest } from "./api";

import type {
  Payment,
  PaymentFormData,
} from "../types/payment";

export async function getPayments(): Promise<Payment[]> {
  return apiRequest<Payment[]>("/payments");
}

export async function createPayment(
  payment: PaymentFormData,
): Promise<Payment> {
  return apiRequest<Payment>("/payments", {
    method: "POST",
    body: payment,
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
      body: payment,
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