class QueueManager {
  constructor(channel) {
    this.channel = channel;
  }

  async ensure(queue, options = {}) {
    await this.channel.assertQueue(queue, {
      durable: true,
      ...options,
    });
  }

  async bind({ queue, exchange, routingKey }) {
    await this.channel.bindQueue(queue, exchange, routingKey);
  }

  async ensureAndBind({ queue, exchange, routingKey, options = {} }) {
    await this.ensure(queue, options);

    await this.bind({
      queue,
      exchange,
      routingKey,
    });
  }
}

module.exports = QueueManager;
