CREATE TABLE IF NOT EXISTS outbox_events
    (
        id            UUID PRIMARY KEY     ,
        "eventName"   VARCHAR(255) NOT NULL,
        exchange      VARCHAR(255) NOT NULL,
        "routingKey"  VARCHAR(255) NOT NULL,
        payload       JSONB NOT NULL       ,
        processed     BOOLEAN DEFAULT FALSE,
        "createdAt"   TIMESTAMP DEFAULT NOW()
    );