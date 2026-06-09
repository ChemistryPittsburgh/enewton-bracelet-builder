import { TOKEN_KEY } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // 204 No Content — successful delete/action, no body
  if (res.status === 204) return undefined as T;

  let json: any;
  try {
    json = await res.json();
  } catch {
    // Server returned a non-JSON body (e.g. an HTML error page from Apache/PHP)
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error ?? "Unknown error", json);
  }

  return json.data as T;
}