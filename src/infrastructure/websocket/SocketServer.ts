// src/infrastructure/websocket/SocketServer.ts

import type { Server as HttpServer } from "http";
import { Server as IoServer } from "socket.io";

import { InternalServerError } from "../../shared/errors/InternalServerError";
import { logger } from "../logging/Logger";

export class SocketServer {
  private static instance: SocketServer | null = null;

  private io: IoServer | null = null;

  private constructor() {}

  static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }

    return SocketServer.instance;
  }

  initialize(httpServer: HttpServer): IoServer {
    this.io = new IoServer(httpServer, {
      cors: {
        origin: "*",
      },
    });

    logger.info("Socket server initialized");

    return this.io;
  }

  /** Throws rather than returning null, so callers cannot forget to check. */
  getIO(): IoServer {
    if (!this.io) {
      throw new InternalServerError("Socket server not initialized");
    }

    return this.io;
  }

  async close(): Promise<void> {
    if (!this.io) {
      return;
    }

    this.io.close();
  }
}
