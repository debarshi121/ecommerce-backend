class MessagingModule {
  constructor(name) {
    this.name = name;
  }

  get exchange() {
    return `${this.name}.exchange`;
  }

  get retryExchange() {
    return `${this.name}.retry.exchange`;
  }

  get deadLetterExchange() {
    return `${this.name}.dead-letter.exchange`;
  }

  get retryQueue() {
    return `${this.name}.retry.queue`;
  }

  get deadLetterQueue() {
    return `${this.name}.dead-letter.queue`;
  }

  get deadLetterRoutingKey() {
    return "dead-letter";
  }
}

module.exports = MessagingModule;
