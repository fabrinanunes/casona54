import { useState } from "react";
import type { FormEvent } from "react";

import {
  PaymentStatus,
  PaymentStatusLabel,
} from "../../constants/paymentConstants";

import type { PaymentFormData } from "../../types/payment";

import {
  formatCurrency,
  getTodayForDateInput,
  parseCurrencyInput,
} from "../../utils/formatUtils";

import "./PaymentModal.css";

type PaymentModalProps = {
  mode: "create" | "edit";
  payment: PaymentFormData;
  onChange: (payment: PaymentFormData) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  error: string | null;
};

function PaymentModal({
  mode,
  payment,
  onChange,
  onClose,
  onSubmit,
  isSaving,
  error,
}: PaymentModalProps) {
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const isEdit = mode === "edit";

  const parsedAmount = parseCurrencyInput(String(payment.amount));

  const handleAmountChange = (value: string) => {
    onChange({
      ...payment,
      amount: value.replace(/[^\d,]/g, ""),
    });
  };

  return (
    <div className="payment-modal-overlay">
      <div
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className="payment-modal__header">
          <div>
            <h2 id="payment-modal-title">
              {isEdit ? "Editar pagamento" : "Novo pagamento"}
            </h2>

            <p>
              {isEdit
                ? "Altere os dados do pagamento."
                : "Adicione um novo gasto da construção."}
            </p>
          </div>

          <button
            className="payment-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <form className="payment-modal__form" onSubmit={onSubmit}>
          {error && (
            <p className="payment-modal__error" role="alert">
              {error}
            </p>
          )}

          <div className="payment-modal__field">
            <label htmlFor="payment-description">Descrição</label>

            <input
              id="payment-description"
              type="text"
              value={payment.description}
              required
              disabled={isSaving}
              onChange={(event) =>
                onChange({
                  ...payment,
                  description: event.target.value,
                })
              }
            />
          </div>

          <div className="payment-modal__field">
            <label htmlFor="payment-amount">Valor</label>

            <input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              value={
                payment.amount === ""
                  ? ""
                  : isAmountFocused
                    ? String(payment.amount)
                    : parsedAmount === null
                      ? String(payment.amount)
                      : formatCurrency(parsedAmount)
              }
              required
              disabled={isSaving}
              onFocus={() => setIsAmountFocused(true)}
              onChange={(event) => handleAmountChange(event.target.value)}
              onBlur={() => setIsAmountFocused(false)}
            />
          </div>

          <div className="payment-modal__field">
            <label htmlFor="payment-due-date">Vencimento</label>

            <input
              id="payment-due-date"
              type="date"
              value={payment.dueDate}
              required
              disabled={isSaving}
              onChange={(event) =>
                onChange({
                  ...payment,
                  dueDate: event.target.value,
                })
              }
            />
          </div>

          <div className="payment-modal__field">
            <label htmlFor="payment-category">Categoria</label>

            <input
              id="payment-category"
              type="text"
              value={payment.category}
              required
              disabled={isSaving}
              onChange={(event) =>
                onChange({
                  ...payment,
                  category: event.target.value,
                })
              }
            />
          </div>

          <div className="payment-modal__field">
            <label htmlFor="payment-responsible">Responsável</label>

            <input
              id="payment-responsible"
              type="text"
              value={payment.responsible}
              required
              disabled={isSaving}
              onChange={(event) =>
                onChange({
                  ...payment,
                  responsible: event.target.value,
                })
              }
            />
          </div>

          {isEdit && (
            <div className="payment-modal__field">
              <label htmlFor="payment-status">Status</label>

              <select
                id="payment-status"
                value={payment.status}
                required
                disabled={isSaving}
                onChange={(event) => {
                  const status = event.target
                    .value as PaymentFormData["status"];

                  onChange({
                    ...payment,
                    status,
                    paidAt:
                      status === PaymentStatus.PAID
                        ? payment.paidAt || getTodayForDateInput()
                        : "",
                  });
                }}
              >
                {Object.values(PaymentStatus).map((status) => (
                  <option key={status} value={status}>
                    {PaymentStatusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEdit && payment.status === PaymentStatus.PAID && (
            <div className="payment-modal__field">
              <label htmlFor="payment-paid-at">Data do pagamento</label>

              <input
                id="payment-paid-at"
                type="date"
                value={payment.paidAt}
                required
                disabled={isSaving}
                onChange={(event) =>
                  onChange({
                    ...payment,
                    paidAt: event.target.value,
                  })
                }
              />
            </div>
          )}

          <div className="payment-modal__actions">
            <button type="button" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>

            <button type="submit" disabled={isSaving}>
              {isSaving
                ? "Salvando..."
                : isEdit
                  ? "Salvar alterações"
                  : "Salvar pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentModal;
