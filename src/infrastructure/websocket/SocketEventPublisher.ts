// src/infrastructure/websocket/SocketEventPublisher.ts

import { socketRegistry } from "./SocketRegistry";
import { SocketServer } from "./SocketServer";

/** Pushes server-side events to connected browsers. */
export class SocketEventPublisher {
  emitToUser(userId: string, event: string, payload: unknown): void {
    const io = SocketServer.getInstance().getIO();

    const sockets = socketRegistry.getSockets(userId);

    if (!sockets) {
      return;
    }

    for (const socketId of sockets) {
      io.to(socketId).emit(event, payload);
    }
  }

  broadcast(event: string, payload: unknown): void {
    const io = SocketServer.getInstance().getIO();

    io.emit(event, payload);
  }
}
