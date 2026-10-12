import {
  PaymentStatus,
} from "../constants/paymentConstants";

import type { Payment } from "../types/payment";

export function isPaymentOverdue(
  payment: Payment,
): boolean {
  if (
    payment.status !==
    PaymentStatus.PENDING
  ) {
    return false;
  }

  const today = new Date();

  const year =
    today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  const todayAsString =
    `${year}-${month}-${day}`;

  return (
    payment.due_date <
    todayAsString
  );
}

export function calculateTotalAmount(
  payments: Payment[],
): number {
  return payments.reduce(
    (total, payment) =>
      total + payment.amount,
    0,
  );
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
  return Object.values(
    payments.reduce<
      Record<
        string,
        {
          category: string;
          amount: number;
        }
      >
    >(
      (accumulator, payment) => {
        if (
          !accumulator[
            payment.category
          ]
        ) {
          accumulator[
            payment.category
          ] = {
            category:
              payment.category,
            amount: 0,
          };
        }

        accumulator[
          payment.category
        ].amount += payment.amount;

        return accumulator;
      },
      {},
    ),
  ).sort(
    (a, b) =>
      b.amount - a.amount,
  );
}

export function calculateMonthlyTotals(
  payments: Payment[],
) {
  const monthlyTotalsMap =
    payments.reduce<
      Record<string, number>
    >(
      (accumulator, payment) => {
        const month =
          payment.due_date.slice(
            0,
            7,
          );

        accumulator[month] =
          (accumulator[month] ?? 0) +
          payment.amount;

        return accumulator;
      },
      {},
    );

  return Object.entries(
    monthlyTotalsMap,
  )
    .map(
      ([month, amount]) => ({
        month,
        amount,
      }),
    )
    .sort(
      (a, b) =>
        a.month.localeCompare(
          b.month,
        ),
    );
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