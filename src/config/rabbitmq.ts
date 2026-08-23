// src/config/rabbitmq.ts

export interface RabbitMqConfig {
  protocol: string;
  host: string | undefined;
  port: number;
  user: string | undefined;
  password: string | undefined;
}

export const rabbitmqConfig: RabbitMqConfig = {
  protocol: "amqp",

  host: process.env.RABBITMQ_HOST,

  port: Number(process.env.RABBITMQ_PORT),

  user: process.env.RABBITMQ_USER,

  password: process.env.RABBITMQ_PASSWORD,
};
