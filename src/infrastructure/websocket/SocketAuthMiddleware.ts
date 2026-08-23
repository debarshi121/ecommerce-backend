// src/infrastructure/websocket/SocketAuthMiddleware.ts

import type { ExtendedError, Socket } from "socket.io";

import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";

/**
 * Socket.IO handshake guard. Declared here so `socket.userId` is typed for
 * every downstream listener.
 */
export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function socketAuth(
  socket: AuthenticatedSocket,
  next: (error?: ExtendedError) => void,
): void {
  const userId = socket.handshake.auth.userId as string | undefined;

  if (!userId) {
    next(new UnauthorizedError("Unauthorized"));

    return;
  }

  socket.userId = userId;

  next();
}
