// src/infrastructure/bullmq/QueueManager.js

const { Queue } = require("bullmq");

class QueueManager {
    constructor(queueName) {
        this.queue = new Queue(queueName, {
            connection: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT
            }
        });
    }

    getQueue() {
        return this.queue;
    }
}

module.exports = QueueManager;