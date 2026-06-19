// SocketAuthMiddleware.js

function socketAuth(socket, next) {

    const userId =
        socket.handshake.auth.userId;

    if (!userId) {
        return next(
            new Error("Unauthorized")
        );
    }

    socket.userId = userId;

    next();
}

module.exports = socketAuth;