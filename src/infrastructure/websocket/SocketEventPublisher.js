// SocketEventPublisher.js

const SocketServer =
    require("./SocketServer");

const SocketRegistry =
    require("./SocketRegistry");

class SocketEventPublisher {

    emitToUser(userId, event, payload) {

        const io =
            SocketServer
                .getInstance()
                .getIO();

        const sockets =
            SocketRegistry.getSockets(
                userId
            );

        if (!sockets) return;

        for (const socketId of sockets) {
            io.to(socketId).emit(
                event,
                payload
            );
        }
    }

    broadcast(event, payload) {

        const io =
            SocketServer
                .getInstance()
                .getIO();

        io.emit(event, payload);
    }
}

module.exports =
    SocketEventPublisher;