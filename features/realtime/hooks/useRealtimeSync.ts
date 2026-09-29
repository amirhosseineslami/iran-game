import { useState, useEffect, useCallback, useRef } from "react";
import type { GameEvent } from "../types";
import { eventBus } from "../eventBus";

export interface ConnectionState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting";
  lastEventId?: string;
  lastTimestamp?: number;
}

type ConnectFn = () => void;
type DisconnectFn = () => void;
type SubscribeFn = <T extends GameEvent>(type: T["type"], callback: (event: T) => void) => () => void;

export function useRealtimeSync(
  playerId: string,
  sessionId: string,
  enabled: boolean = true,
): {
  connectionState: ConnectionState;
  connect: ConnectFn;
  disconnect: DisconnectFn;
  subscribe: SubscribeFn;
  scheduleReconnect: () => void;
} {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const connectInternal = useCallback(() => {
    if (!enabled || !isMountedRef.current) return;

    setConnectionState((prev) => ({
      ...prev,
      status: prev.status === "disconnected" ? "connecting" : "reconnecting",
    }));

    // Simulate successful connection (in production this would be a real WebSocket)
    setTimeout(() => {
      if (isMountedRef.current) {
        setConnectionState({
          status: "connected",
          lastTimestamp: Date.now(),
        });
      }
    }, 100);
  }, [enabled]);

  const disconnectInternal = useCallback(() => {
    if (!isMountedRef.current) return;
    setConnectionState({ status: "disconnected" });
  }, []);

  const subscribe = useCallback(
    <T extends GameEvent>(eventType: T["type"], callback: (event: T) => void) => {
      const subscription = eventBus.subscribe(eventType);

      const originalCallback = subscription.callback;
      subscription.callback = ((event: unknown) => {
        const typedEvent = event as T;
        if (typedEvent.playerId !== playerId && typedEvent.sessionId !== sessionId) {
          return;
        }
        callback(typedEvent);
        originalCallback(typedEvent);
      }) as (event: T) => void;

      return subscription.unsubscribe;
    },
    [playerId, sessionId],
  );

  // Track mount state for effect cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Trigger connect/disconnect based on enabled prop
  useEffect(() => {
    if (enabled) {
      connectInternal();
    } else {
      disconnectInternal();
    }
  }, [enabled]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(connectInternal, 2000);
  }, [connectInternal]);

  return {
    connectionState,
    connect: connectInternal,
    disconnect: disconnectInternal,
    subscribe,
    scheduleReconnect,
  };
}
