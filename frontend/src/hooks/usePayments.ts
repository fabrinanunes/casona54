import { useCallback, useEffect, useState } from "react";

import { getUserFacingError } from "../services/api";
import {
  createPayment,
  deletePayment,
  getPayments,
  markPaymentAsPaid,
  updatePayment,
} from "../services/paymentsService";
import type { Payment, PaymentFormData } from "../types/payment";

type UsePaymentsResult = {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  create: (payment: PaymentFormData) => Promise<void>;
  update: (id: number, payment: PaymentFormData) => Promise<void>;
  remove: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
  markAsPaid: (id: number) => Promise<void>;
  isRefreshing: boolean;
};

export function usePayments(): UsePaymentsResult {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const data = await getPayments();

      setPayments(data);
      setError(null);
    } catch (error) {
      setError(
        getUserFacingError(
          error,
          "Não foi possível carregar os pagamentos. Confira sua conexão.",
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      try {
        const data = await getPayments();

        if (isMounted) {
          setPayments(data);
          setError(null);
        }
      } catch (error) {
        console.error("Error fetching payments:", error);

        if (isMounted) {
          setError(
            getUserFacingError(
              error,
              "Não foi possível carregar os pagamentos. Confira sua conexão.",
            ),
          );
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

  const markAsPaid = useCallback(
    async (id: number) => {
      await markPaymentAsPaid(id);
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
    markAsPaid,
    isRefreshing,
  };
}
