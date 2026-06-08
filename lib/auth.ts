const key = process.env.NEXT_PUBLIC_TOKEN_KEY;
if (!key) throw new Error("NEXT_PUBLIC_TOKEN_KEY is not set");
export const TOKEN_KEY: string = key;

export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);

export const clearToken = (): void =>
  localStorage.removeItem(TOKEN_KEY);
