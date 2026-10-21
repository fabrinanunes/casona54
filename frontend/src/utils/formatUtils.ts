export function formatMonth(
  month: string,
): string {
  const [year, monthNumber] =
    month.split("-");

  const date = new Date(
    Number(year),
    Number(monthNumber) - 1,
    1,
  );

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

export function formatDate(
  date: string,
): string {
  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

export function formatCurrency(
  value: number,
): string {
  return value.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  );
}

export function normalizeCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^\d,.]/g, "");

  if (!cleaned) return "";

  const commaIndex = cleaned.lastIndexOf(",");

  if (commaIndex >= 0) {
    const integerPart = cleaned
      .slice(0, commaIndex)
      .replace(/[^\d]/g, "");
    const decimalPart = cleaned
      .slice(commaIndex + 1)
      .replace(/[^\d]/g, "")
      .slice(0, 2);

    return `${integerPart || "0"},${decimalPart}`;
  }

  const dotIndex = cleaned.lastIndexOf(".");

  if (dotIndex >= 0) {
    const digitsAfterDot = cleaned.length - dotIndex - 1;

    if (digitsAfterDot >= 3) {
      return cleaned.replace(/[^\d]/g, "");
    }

    const integerPart = cleaned
      .slice(0, dotIndex)
      .replace(/[^\d]/g, "");
    const decimalPart = cleaned
      .slice(dotIndex + 1)
      .replace(/[^\d]/g, "")
      .slice(0, 2);

    return `${integerPart || "0"},${decimalPart}`;
  }

  return cleaned.replace(/[^\d]/g, "");
}

export function formatCurrencyInput(value: string): string {
  if (!value) return "";

  const [integerPart, decimalPart] = value.split(",");
  const integerValue = Number(integerPart || "0");
  const formattedInteger = integerValue.toLocaleString("pt-BR");

  return `R$ ${formattedInteger}${
    decimalPart === undefined ? "" : `,${decimalPart}`
  }`;
}

export function getTodayForDateInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseCurrencyInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}