// SocketServer.js

const { Server } = require("socket.io");
const logger = require("../logging/Logger");

class SocketServer {
  static instance = null;

  constructor() {
    if (SocketServer.instance) {
      return SocketServer.instance;
    }

    this.io = null;

    SocketServer.instance = this;
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });

    logger.info("Socket server initialized");
  }

  getIO() {
    return this.io;
  }

  static getInstance() {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }

    return SocketServer.instance;
  }
}

module.exports = SocketServer;
