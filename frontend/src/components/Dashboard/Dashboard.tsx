import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  PaymentStatus,
  PaymentStatusLabel,
} from "../../constants/paymentConstants";

import { usePayments } from "../../hooks/usePayments";
import { usePaymentForm } from "../../hooks/usePaymentForm";
import PaymentModal from "../PaymentModal/PaymentModal";
import { PaymentFrequencyLabel } from "../../constants/frequencyConstants";

import {
  formatCurrency,
  formatDate,
  formatMonth,
} from "../../utils/formatUtils";

import {
  calculateCategoryTotals,
  calculateMonthlyTotals,
  calculatePaymentSummary,
  getPaymentCategories,
  getPaymentResponsibles,
  isPaymentOverdue,
} from "../../utils/paymentUtils";

import {
  filterPayments,
  sortPayments,
  type PaymentFilters,
  type PaymentSort,
} from "../../utils/paymentFilterUtils";

import "./Dashboard.css";

type DashboardProps = {
  onLogout: () => Promise<void>;
};

export default function Dashboard({ onLogout }: DashboardProps) {
  const { payments, isLoading, error, create, update, remove, markAsPaid } =
    usePayments();
  const paymentForm = usePaymentForm();
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingPaymentId, setMarkingPaymentId] = useState<number | null>(null);

  const [filters, setFilters] = useState<PaymentFilters>({
    status: "all",
    search: "",
    category: "all",
    responsible: "all",
    dueDateFrom: "",
    dueDateTo: "",
  });

  const [sortBy, setSortBy] = useState<PaymentSort>("dueDateAsc");

  const summary = useMemo(() => calculatePaymentSummary(payments), [payments]);

  const categoryTotals = useMemo(
    () => calculateCategoryTotals(payments),
    [payments],
  );

  const monthlyTotals = useMemo(
    () => calculateMonthlyTotals(payments),
    [payments],
  );

  const categories = useMemo(() => getPaymentCategories(payments), [payments]);

  const responsibles = useMemo(
    () => getPaymentResponsibles(payments),
    [payments],
  );

  const filteredPayments = useMemo(
    () => filterPayments(payments, filters),
    [payments, filters],
  );

  const sortedPayments = useMemo(
    () => sortPayments(filteredPayments, sortBy),
    [filteredPayments, sortBy],
  );

  const handleFilterChange = (field: keyof PaymentFilters, value: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    setActionError(null);

    try {
      if (
        paymentForm.mode === "edit" &&
        paymentForm.editingPaymentId !== null
      ) {
        await update(paymentForm.editingPaymentId, paymentForm.payment);
      } else {
        await create(paymentForm.payment);
      }

      paymentForm.close();
    } catch (error) {
      console.error("Error saving payment:", error);
      setActionError("Não foi possível salvar o pagamento. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (id: number, description: string) => {
    const confirmed = window.confirm(
      `Deseja excluir o pagamento "${description}"? Essa ação não pode ser desfeita.`,
    );

    if (!confirmed) return;

    setActionError(null);

    try {
      await remove(id);
    } catch (error) {
      console.error("Error deleting payment:", error);
      setActionError("Não foi possível excluir o pagamento. Tente novamente.");
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    setMarkingPaymentId(id);
    setActionError(null);

    try {
      await markAsPaid(id);
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      setActionError(
        "Não foi possível marcar o pagamento como pago. Tente novamente.",
      );
    } finally {
      setMarkingPaymentId(null);
    }
  };

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Nosso Lar</h1>
          <p>Controle financeiro da casa</p>
        </div>

        <button type="button" className="dashboard__logout" onClick={onLogout}>
          Sair
        </button>
      </header>

      {(error || actionError) && (
        <div className="dashboard__error">
          {actionError ?? "Não foi possível carregar os pagamentos."}
        </div>
      )}

      <section className="dashboard__summary">
        <article className="summary-card">
          <span className="summary-card__label">Total</span>

          <strong className="summary-card__value">
            {formatCurrency(summary.totalAmount)}
          </strong>

          <span className="summary-card__count">
            {summary.totalCount} pagamentos
          </span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">Pagos</span>

          <strong className="summary-card__value">
            {formatCurrency(summary.paidAmount)}
          </strong>

          <span className="summary-card__count">
            {summary.paidCount} pagamentos
          </span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">Pendentes</span>

          <strong className="summary-card__value">
            {formatCurrency(summary.pendingAmount)}
          </strong>

          <span className="summary-card__count">
            {summary.pendingCount} pagamentos
          </span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">Em atraso</span>

          <strong className="summary-card__value">
            {formatCurrency(summary.overdueAmount)}
          </strong>

          <span className="summary-card__count">
            {summary.overdueCount} pagamentos
          </span>
        </article>
      </section>

      <section className="dashboard__charts">
        <div className="dashboard__chart">
          <h2>Por categoria</h2>

          <div className="category-list">
            {categoryTotals.map((item) => (
              <div key={item.category} className="category-item">
                <div className="category-item__header">
                  <span>{item.category}</span>

                  <strong>{formatCurrency(item.amount)}</strong>
                </div>

                <div className="category-item__bar">
                  <div
                    className="category-item__progress"
                    style={{
                      width: `${
                        summary.totalAmount > 0
                          ? (item.amount / summary.totalAmount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard__chart">
          <h2>Por mês</h2>

          <div className="monthly-list">
            {monthlyTotals.map((item) => (
              <div key={item.month} className="monthly-item">
                <div className="monthly-item__header">
                  <span>{formatMonth(item.month)}</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                </div>

                <div className="category-item__bar">
                  <div
                    className="category-item__progress"
                    style={{
                      width: `${
                        summary.totalAmount > 0
                          ? (item.amount / summary.totalAmount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard__payments">
        <div className="dashboard__payments-header">
          <div>
            <h2>Pagamentos</h2>

            <span>
              {sortedPayments.length} resultado
              {sortedPayments.length !== 1 ? "s" : ""}
            </span>
          </div>

          <button
            type="button"
            className="dashboard__add-payment"
            onClick={() => {
              setActionError(null);
              paymentForm.openCreate();
            }}
          >
            Novo pagamento
          </button>
        </div>

        <div className="dashboard__filters">
          <input
            type="text"
            placeholder="Buscar pagamento..."
            value={filters.search}
            onChange={(event) =>
              handleFilterChange("search", event.target.value)
            }
          />

          <select
            value={filters.status}
            onChange={(event) =>
              handleFilterChange("status", event.target.value)
            }
          >
            <option value="all">Todos os status</option>

            {Object.values(PaymentStatus).map((status) => (
              <option key={status} value={status}>
                {PaymentStatusLabel[status]}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(event) =>
              handleFilterChange("category", event.target.value)
            }
          >
            <option value="all">Todas as categorias</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={filters.responsible}
            onChange={(event) =>
              handleFilterChange("responsible", event.target.value)
            }
          >
            <option value="all">Todos os responsáveis</option>

            {responsibles.map((responsible) => (
              <option key={responsible} value={responsible}>
                {responsible}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dueDateFrom}
            onChange={(event) =>
              handleFilterChange("dueDateFrom", event.target.value)
            }
          />

          <input
            type="date"
            value={filters.dueDateTo}
            onChange={(event) =>
              handleFilterChange("dueDateTo", event.target.value)
            }
          />

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as PaymentSort)}
          >
            <option value="dueDateAsc">Vencimento: mais antigo</option>

            <option value="dueDateDesc">Vencimento: mais recente</option>

            <option value="amountAsc">Valor: menor para maior</option>

            <option value="amountDesc">Valor: maior para menor</option>
          </select>
        </div>

        {isLoading ? (
          <div className="dashboard__loading">Carregando pagamentos...</div>
        ) : sortedPayments.length === 0 ? (
          <div className="dashboard__empty">Nenhum pagamento encontrado.</div>
        ) : (
          <div className="payment-list">
            {sortedPayments.map((payment) => {
              const overdue = isPaymentOverdue(payment);

              return (
                <article key={payment.id} className="payment-card">
                  <div className="payment-card__main">
                    <div>
                      <h3>{payment.description}</h3>

                      <span>{payment.category}</span>
                    </div>

                    <strong>{formatCurrency(payment.amount)}</strong>
                  </div>

                  <div className="payment-card__details">
                    <span>Vencimento: {formatDate(payment.due_date)}</span>
                    <span>
                      Frequência: {PaymentFrequencyLabel[payment.frequency]}
                    </span>
                    <span>Responsável: {payment.responsible}</span>

                    <span
                      className={`payment-status ${
                        overdue
                          ? "payment-status--overdue"
                          : `payment-status--${payment.status}`
                      }`}
                    >
                      {overdue
                        ? "Em atraso"
                        : PaymentStatusLabel[payment.status]}
                    </span>

                    {payment.status === PaymentStatus.PAID &&
                      payment.paid_at && (
                        <span>Pago em: {formatDate(payment.paid_at)}</span>
                      )}

                    <div className="payment-card__actions">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          paymentForm.openEdit(payment);
                        }}
                      >
                        Editar
                      </button>

                      {payment.status === PaymentStatus.PENDING && (
                        <button
                          type="button"
                          disabled={markingPaymentId === payment.id}
                          onClick={() => void handleMarkAsPaid(payment.id)}
                        >
                          {markingPaymentId === payment.id
                            ? "Atualizando..."
                            : "Marcar como pago"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="payment-card__delete"
                        onClick={() =>
                          void handleDeletePayment(
                            payment.id,
                            payment.description,
                          )
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {paymentForm.isOpen && (
        <PaymentModal
          mode={paymentForm.mode}
          payment={paymentForm.payment}
          onChange={paymentForm.setPayment}
          onClose={paymentForm.close}
          onSubmit={handlePaymentSubmit}
          isSaving={isSaving}
          error={actionError}
        />
      )}
    </main>
  );
}
