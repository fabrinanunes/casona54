import { useCallback, useEffect, useState } from "react";

import {
  createPayment,
  deletePayment,
  getPayments,
  updatePayment,
} from "../services/paymentsService";

import type {
  Payment,
  PaymentFormData,
} from "../types/payment";

type UsePaymentsResult = {
  payments: Payment[];
  isLoading: boolean;
  error: boolean;
  create: (payment: PaymentFormData) => Promise<void>;
  update: (id: number, payment: PaymentFormData) => Promise<void>;
  remove: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

export function usePayments(): UsePaymentsResult {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(false);

      const data = await getPayments();

      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      try {
        const data = await getPayments();

        if (isMounted) {
          setPayments(data);
          setError(false);
        }
      } catch (error) {
        console.error("Error fetching payments:", error);

        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  const create = useCallback(
    async (payment: PaymentFormData) => {
      await createPayment(payment);
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: number, payment: PaymentFormData) => {
      await updatePayment(id, payment);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number) => {
      await deletePayment(id);
      await refresh();
    },
    [refresh],
  );

  return {
    payments,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh,
  };
}