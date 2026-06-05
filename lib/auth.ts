export const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY!;

export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);

export const clearToken = (): void =>
  localStorage.removeItem(TOKEN_KEY);
