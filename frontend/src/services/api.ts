import { validationMessages } from "../constants/errorMessages";

const apiUrl = import.meta.env.VITE_API_URL;

type ApiRequestOptions = Omit<
  RequestInit,
  "body"
> & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function getApiErrorMessage(
  response: Response,
): Promise<string> {
  const responseMessage = (await response.text()).trim();

  if (response.status >= 500) {
    return "O servidor não conseguiu concluir a operação. Tente novamente.";
  }

  if (response.status === 401) {
    return "Usuário ou senha incorretos, ou sessão expirada.";
  }

  if (response.status === 404) {
    return "O registro solicitado não foi encontrado.";
  }

  if (response.status === 400) {
    return (
      validationMessages[responseMessage] ??
      "Confira os dados informados e tente novamente."
    );
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

export function getUserFacingError(
  error: unknown,
  fallback: string,
): string {
  return error instanceof ApiError ? error.message : fallback;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, ...requestOptions } = options;

  const response = await fetch(
    `${apiUrl}${endpoint}`,
    {
      ...requestOptions,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...requestOptions.headers,
      },
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    },
  );

  if (!response.ok) {
    throw new ApiError(
      response.status,
      await getApiErrorMessage(response),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
