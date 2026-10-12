export const apiUrl = import.meta.env.VITE_API_URL;

type ApiRequestOptions = Omit<
  RequestInit,
  "body"
> & {
  body?: unknown;
};

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
    throw new Error(
      `Erro na API: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}