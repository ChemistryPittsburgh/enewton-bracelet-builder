import Pusher from "pusher-js";
import { getToken } from "@/lib/auth";
import { handleQueryError } from "@/lib/query-client";
import { ApiError } from "@/lib/api";

Pusher.logToConsole = process.env.NODE_ENV !== "production";

const APP_KEY = process.env.NEXT_PUBLIC_PUSHER_APP_KEY ?? "";
const CLUSTER  = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1";
const AUTH_URL = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/pusher/auth`;

let _pusher: Pusher | null = null;

export function getPusher(): Pusher {
  if (_pusher) return _pusher;

  _pusher = new Pusher(APP_KEY, {
    cluster: CLUSTER,
    forceTLS: true,
    // Use the authorizer pattern so the Bearer token is read at subscription
    // time rather than at Pusher init, keeping the singleton safe to create
    // before the user logs in.
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        const token = getToken();
        fetch(AUTH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: new URLSearchParams({
            socket_id: socketId,
            channel_name: channel.name,
          }).toString(),
        })
          .then((res) => {
            if (!res.ok) {
              const err = new ApiError(res.status, `Pusher auth failed: HTTP ${res.status}`);
              handleQueryError(err);   // 401 → terminates session; no-op for other statuses
              console.error(err);
              callback(err, null);     // always propagate — don't couple authorizer to redirect behavior
              return;
            }
            return res.json();
          })
          .then((data) => { if (data) callback(null, data); })
          .catch((err) => { console.error("Pusher auth error:", err); callback(err, null); });
      },
    }),
  });

  return _pusher;
}

/** Disconnect and reset the singleton. Call on logout so a re-login gets a
 *  fresh connection under the new user's identity. */
export function disconnectPusher(): void {
  if (_pusher) {
    _pusher.disconnect();
    _pusher = null;
  }
}
