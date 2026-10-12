import type { Payment } from "../types/payment";

export type PaymentFilters = {
  status: string;
  search: string;
  category: string;
  responsible: string;
  dueDateFrom: string;
  dueDateTo: string;
};

export type PaymentSort =
  | "dueDateAsc"
  | "dueDateDesc"
  | "amountAsc"
  | "amountDesc";

export function filterPayments(
  payments: Payment[],
  filters: PaymentFilters,
): Payment[] {
  return payments.filter(
    (payment) => {
      const matchesStatus =
        filters.status === "all" ||
        payment.status ===
          filters.status;

      const matchesSearch =
        payment.description
          .toLowerCase()
          .includes(
            filters.search.toLowerCase(),
          );

      const matchesCategory =
        filters.category === "all" ||
        payment.category ===
          filters.category;

      const matchesResponsible =
        filters.responsible ===
          "all" ||
        payment.responsible ===
          filters.responsible;

      const matchesDueDateFrom =
        filters.dueDateFrom === "" ||
        payment.due_date >=
          filters.dueDateFrom;

      const matchesDueDateTo =
        filters.dueDateTo === "" ||
        payment.due_date <=
          filters.dueDateTo;

      return (
        matchesStatus &&
        matchesSearch &&
        matchesCategory &&
        matchesResponsible &&
        matchesDueDateFrom &&
        matchesDueDateTo
      );
    },
  );
}

export function sortPayments(
  payments: Payment[],
  sortBy: PaymentSort,
): Payment[] {
  return [...payments].sort(
    (a, b) => {
      switch (sortBy) {
        case "dueDateDesc":
          return b.due_date.localeCompare(
            a.due_date,
          );

        case "amountAsc":
          return (
            a.amount - b.amount
          );

        case "amountDesc":
          return (
            b.amount - a.amount
          );

        case "dueDateAsc":
        default:
          return a.due_date.localeCompare(
            b.due_date,
          );
      }
    },
  );
}