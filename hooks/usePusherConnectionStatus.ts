"use client";
import { useEffect, useState } from "react";
import { getPusher } from "@/lib/pusher";

export function usePusherConnectionStatus(): boolean {
  const [connected, setConnected] = useState(
    () => getPusher().connection.state === "connected",
  );

  useEffect(() => {
    const pusher = getPusher();
    const handler = ({ current }: { previous: string; current: string }) => {
      setConnected(current === "connected");
    };
    pusher.connection.bind("state_change", handler);
    return () => { pusher.connection.unbind("state_change", handler); };
  }, []);

  return connected;
}
