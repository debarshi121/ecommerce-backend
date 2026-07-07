class ExchangeManager {
  constructor(channel) {
    this.channel = channel;
  }

  async ensure(exchange) {
    await this.channel.assertExchange(exchange, "topic", {
      durable: true,
    });
  }

  async ensureMany(exchanges) {
    for (const exchange of exchanges) {
      await this.ensure(exchange);
    }
  }
}

module.exports = ExchangeManager;
