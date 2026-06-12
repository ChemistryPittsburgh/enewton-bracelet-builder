import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { clearToken } from "@/lib/auth";

export function handleQueryError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    // Guard against concurrent firing: when a token expires every active query
    // fails at once. Also prevents a redirect loop if the login page ever fires
    // an authed query. 401 is always terminal — there is no token refresh.
    if (window.location.pathname === "/login") return;
    clearToken();
    window.location.replace("/login");
    // No explicit disconnectPusher() — page unload closes the WebSocket.
    // Explicit logout (UserScreen.handleSignOut) already calls disconnectPusher
    // before navigation; that path is unchanged.
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({ onError: handleQueryError }),
  defaultOptions: {
    queries: {
      // Don't retry on 401 — auth failures redirect immediately.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status === 401) && failureCount < 3,
    },
  },
});
