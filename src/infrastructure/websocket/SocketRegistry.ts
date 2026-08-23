// src/infrastructure/websocket/SocketRegistry.ts

/**
 * userId -> the socket ids that user currently has open (one per tab or
 * device), so a message can be delivered to every session of one user.
 */
class SocketRegistry {
  private readonly connectedUsers = new Map<string, Set<string>>();

  addConnection(userId: string, socketId: string): void {
    const existing = this.connectedUsers.get(userId);

    if (existing) {
      existing.add(socketId);

      return;
    }

    this.connectedUsers.set(userId, new Set([socketId]));
  }

  removeConnection(userId: string, socketId: string): void {
    const sockets = this.connectedUsers.get(userId);

    if (!sockets) {
      return;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  getSockets(userId: string): Set<string> | undefined {
    return this.connectedUsers.get(userId);
  }
}

export const socketRegistry = new SocketRegistry();
