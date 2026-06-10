import Pusher from "pusher-js";
import { getToken } from "@/lib/auth";

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
          .then((res) => res.json())
          .then((data) => callback(null, data))
          .catch((err) => callback(err, null));
      },
    }),
  });

  return _pusher;
}
