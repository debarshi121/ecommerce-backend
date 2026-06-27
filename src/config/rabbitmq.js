// src/config/rabbitmq.js

module.exports = {
  protocol: "amqp",

  host: process.env.RABBITMQ_HOST,

  port: Number(process.env.RABBITMQ_PORT),

  user: process.env.RABBITMQ_USER,

  password: process.env.RABBITMQ_PASSWORD,
};
