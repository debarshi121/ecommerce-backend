// SocketAuthMiddleware.js
const UnauthorizedError = require("../errors/UnauthorizedError");

function socketAuth(socket, next) {
  const userId = socket.handshake.auth.userId;

  if (!userId) {
    return next(new UnauthorizedError("Unauthorized"));
  }

  socket.userId = userId;

  next();
}

module.exports = socketAuth;
