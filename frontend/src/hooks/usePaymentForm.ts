import {
  useCallback,
  useState,
} from "react";

import {
  PaymentStatus,
} from "../constants/paymentConstants";

import type {
  Payment,
  PaymentFormData,
} from "../types/payment";

type PaymentModalMode =
  | "create"
  | "edit";

type UsePaymentFormResult = {
  isOpen: boolean;
  mode: PaymentModalMode;
  payment: PaymentFormData;
  editingPaymentId: number | null;
  openCreate: () => void;
  openEdit: (payment: Payment) => void;
  close: () => void;
  updateField: <
    K extends keyof PaymentFormData,
  >(
    field: K,
    value: PaymentFormData[K],
  ) => void;
  setPayment: (
    payment: PaymentFormData,
  ) => void;
};

const initialPayment: PaymentFormData = {
  description: "",
  amount: "",
  dueDate: "",
  category: "",
  responsible: "",
  status: PaymentStatus.PENDING,
};

function paymentToFormData(
  payment: Payment,
): PaymentFormData {
  return {
    description: payment.description,
    amount: payment.amount,
    dueDate: payment.due_date,
    category: payment.category,
    responsible: payment.responsible,
    status: payment.status,
  };
}

export function usePaymentForm(): UsePaymentFormResult {
  const [isOpen, setIsOpen] =
    useState(false);

  const [mode, setMode] =
    useState<PaymentModalMode>(
      "create",
    );

  const [payment, setPayment] =
    useState<PaymentFormData>(
      initialPayment,
    );

  const [
    editingPaymentId,
    setEditingPaymentId,
  ] = useState<number | null>(null);

  const openCreate = useCallback(
    () => {
      setMode("create");
      setPayment(initialPayment);
      setEditingPaymentId(null);
      setIsOpen(true);
    },
    [],
  );

  const openEdit = useCallback(
    (payment: Payment) => {
      setMode("edit");
      setPayment(
        paymentToFormData(payment),
      );
      setEditingPaymentId(payment.id);
      setIsOpen(true);
    },
    [],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingPaymentId(null);
  }, []);

  const updateField = useCallback(
    <
      K extends keyof PaymentFormData,
    >(
      field: K,
      value: PaymentFormData[K],
    ) => {
      setPayment(
        (currentPayment) => ({
          ...currentPayment,
          [field]: value,
        }),
      );
    },
    [],
  );

  return {
    isOpen,
    mode,
    payment,
    editingPaymentId,
    openCreate,
    openEdit,
    close,
    updateField,
    setPayment,
  };
}