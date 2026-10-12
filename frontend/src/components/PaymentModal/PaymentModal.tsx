import { useState } from "react";
import type { FormEvent } from "react";

import {
  PaymentStatus,
  PaymentStatusLabel,
} from "../../constants/paymentConstants";

import type { PaymentFormData } from "../../types/payment";

import { formatCurrency } from "../../utils/formatUtils";

import "./PaymentModal.css";

type PaymentModalProps = {
  mode: "create" | "edit";
  payment: PaymentFormData;
  onChange: (payment: PaymentFormData) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function PaymentModal({
  mode,
  payment,
  onChange,
  onClose,
  onSubmit,
}: PaymentModalProps) {
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const isEdit = mode === "edit";

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");

    onChange({
      ...payment,
      amount: numericValue === "" ? "" : Number(numericValue),
    });
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="payment-modal__header">
          <div>
            <h2>{isEdit ? "Editar pagamento" : "Novo pagamento"}</h2>

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
          >
            ×
          </button>
        </div>

        <form className="payment-modal__form" onSubmit={onSubmit}>
          <div className="payment-modal__field">
            <label htmlFor="payment-description">Descrição</label>

            <input
              id="payment-description"
              type="text"
              value={payment.description}
              required
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
              inputMode="numeric"
              value={
                payment.amount === ""
                  ? ""
                  : isAmountFocused
                    ? String(payment.amount)
                    : formatCurrency(Number(payment.amount))
              }
              required
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
                onChange={(event) =>
                  onChange({
                    ...payment,
                    status: event.target.value as PaymentFormData["status"],
                  })
                }
              >
                {Object.values(PaymentStatus).map((status) => (
                  <option key={status} value={status}>
                    {PaymentStatusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="payment-modal__actions">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit">
              {isEdit ? "Salvar alterações" : "Salvar pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentModal;
