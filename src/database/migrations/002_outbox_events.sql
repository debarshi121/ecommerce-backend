CREATE TABLE IF NOT EXISTS outbox_events
    (
        id          UUID PRIMARY KEY     ,
        event_name  VARCHAR(255) NOT NULL,
        exchange    VARCHAR(255) NOT NULL,
        routing_key VARCHAR(255) NOT NULL,
        payload     JSONB NOT NULL       ,
        processed   BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMP DEFAULT NOW()
    );