// src/infrastructure/bullmq/WorkerManager.js

const { Worker } = require("bullmq");

class WorkerManager {
    constructor(queueName, handler) {

        this.worker = new Worker(
            queueName,

            async (job) => {
                await handler(job);
            },

            {
                connection: {
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT
                },

                concurrency: 5
            }
        );

        this.worker.on(
            "completed",
            (job) => {
                console.log(
                    `Job completed ${job.id}`
                );
            }
        );

        this.worker.on(
            "failed",
            (job, error) => {
                console.error(
                    `Job failed ${job.id}`,
                    error
                );
            }
        );
    }
}

module.exports = WorkerManager;