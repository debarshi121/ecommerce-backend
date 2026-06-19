// SocketRegistry.js

class SocketRegistry {
    constructor() {
        this.connectedUsers = new Map();
    }

    addConnection(userId, socketId) {
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(
                userId,
                new Set()
            );
        }

        this.connectedUsers
            .get(userId)
            .add(socketId);
    }

    removeConnection(userId, socketId) {
        const sockets =
            this.connectedUsers.get(userId);

        if (!sockets) return;

        sockets.delete(socketId);

        if (sockets.size === 0) {
            this.connectedUsers.delete(userId);
        }
    }

    getSockets(userId) {
        return this.connectedUsers.get(userId);
    }
}

module.exports = new SocketRegistry();