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

export function getTodayForDateInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}