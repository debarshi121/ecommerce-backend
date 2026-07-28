CREATE TABLE IF NOT EXISTS inbox_events
    (
        id            UUID PRIMARY KEY                          ,
        "eventId"     UUID NOT NULL                              ,
        "eventName"   VARCHAR(255) NOT NULL                      ,
        module        VARCHAR(255) NOT NULL                      ,
        queue         VARCHAR(255) NOT NULL                      ,
        payload       JSONB NOT NULL                             ,
        status        VARCHAR(20) NOT NULL DEFAULT 'PROCESSING'  ,
        "lastError"   TEXT                                       ,
        "processedAt" TIMESTAMP                                  ,
        "createdAt"   TIMESTAMP DEFAULT NOW()                    ,
        "updatedAt"   TIMESTAMP DEFAULT NOW()                    ,

        CONSTRAINT uq_inbox_events_event_id_queue UNIQUE ("eventId", queue),
        CONSTRAINT chk_inbox_events_status CHECK (status IN ('PROCESSING', 'PROCESSED', 'FAILED'))
    );
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_inbox_events_status_processed_at
        ON inbox_events (status, "processedAt");
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_inbox_events_created_at
        ON inbox_events ("createdAt");
