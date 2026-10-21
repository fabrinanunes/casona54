import {
  PaymentStatus,
} from "../constants/paymentConstants";

import type { Payment } from "../types/payment";
import { getTodayForDateInput } from "./formatUtils";

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function isPaymentOverdue(
  payment: Payment,
): boolean {
  if (
    payment.status !==
    PaymentStatus.PENDING
  ) {
    return false;
  }

  return payment.due_date < getTodayForDateInput();
}

export function calculateTotalAmount(
  payments: Payment[],
): number {
  const totalInCents = payments.reduce(
    (total, payment) => total + toCents(payment.amount),
    0,
  );

  return fromCents(totalInCents);
}

export function calculatePaymentsByStatus(
  payments: Payment[],
  status: Payment["status"],
): Payment[] {
  return payments.filter(
    (payment) =>
      payment.status === status,
  );
}

export function calculatePaymentSummary(
  payments: Payment[],
) {
  const paidPayments =
    calculatePaymentsByStatus(
      payments,
      PaymentStatus.PAID,
    );

  const pendingPayments =
    calculatePaymentsByStatus(
      payments,
      PaymentStatus.PENDING,
    );

  const overduePayments =
    pendingPayments.filter(
      isPaymentOverdue,
    );

  return {
    totalAmount:
      calculateTotalAmount(
        payments,
      ),

    paidAmount:
      calculateTotalAmount(
        paidPayments,
      ),

    paidCount:
      paidPayments.length,

    pendingAmount:
      calculateTotalAmount(
        pendingPayments,
      ),

    pendingCount:
      pendingPayments.length,

    overdueAmount:
      calculateTotalAmount(
        overduePayments,
      ),

    overdueCount:
      overduePayments.length,

    totalCount:
      payments.length,
  };
}

export function calculateCategoryTotals(
  payments: Payment[],
) {
  const totalsInCents = payments.reduce<
    Record<string, { category: string; amountInCents: number }>
  >((accumulator, payment) => {
    if (!accumulator[payment.category]) {
      accumulator[payment.category] = {
        category: payment.category,
        amountInCents: 0,
      };
    }

    accumulator[payment.category].amountInCents += toCents(
      payment.amount,
    );

    return accumulator;
  }, {});

  return Object.values(totalsInCents)
    .sort((a, b) => b.amountInCents - a.amountInCents)
    .map(({ category, amountInCents }) => ({
      category,
      amount: fromCents(amountInCents),
    }));
}

export function calculateMonthlyTotals(
  payments: Payment[],
) {
  const monthlyTotalsInCents = payments.reduce<
    Record<string, number>
  >((accumulator, payment) => {
    const month = payment.due_date.slice(0, 7);

    accumulator[month] =
      (accumulator[month] ?? 0) + toCents(payment.amount);

    return accumulator;
  }, {});

  return Object.entries(monthlyTotalsInCents)
    .map(([month, amountInCents]) => ({
      month,
      amount: fromCents(amountInCents),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getPaymentCategories(
  payments: Payment[],
): string[] {
  return [
    ...new Set(
      payments.map(
        (payment) =>
          payment.category,
      ),
    ),
  ];
}

export function getPaymentResponsibles(
  payments: Payment[],
): string[] {
  return [
    ...new Set(
      payments.map(
        (payment) =>
          payment.responsible,
      ),
    ),
  ].filter(Boolean);
}
