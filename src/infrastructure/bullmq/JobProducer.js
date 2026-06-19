// src/infrastructure/bullmq/JobProducer.js

class JobProducer {
    constructor(queueManager) {
        this.queue = queueManager.getQueue();
    }

    async addJob(
        jobName,
        payload,
        options = {}
    ) {

        await this.queue.add(
            jobName,
            payload,
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 3000
                },
                ...options
            }
        );

        console.log(
            `Job added ${jobName}`
        );
    }
}

module.exports = JobProducer;