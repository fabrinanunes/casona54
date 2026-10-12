import { apiRequest } from "./api";

import type { User } from "../types/user";

type LoginData = {
  email: string;
  password: string;
};

export async function login(
  data: LoginData,
): Promise<void> {
  await apiRequest<void>("/login", {
    method: "POST",
    body: data,
  });
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/logout", {
    method: "POST",
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/me");
}