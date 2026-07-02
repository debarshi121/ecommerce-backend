CREATE EXTENSION
IF NOT EXISTS "uuid-ossp";
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS roles
        (
            id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name       VARCHAR(100) NOT NULL UNIQUE               ,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS permissions
        (
            id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name       VARCHAR(100) NOT NULL UNIQUE               ,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS users
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name          VARCHAR(255) NOT NULL                      ,
            email         VARCHAR(255) UNIQUE NOT NULL               ,
            password_hash TEXT NOT NULL                              ,
            role_id       UUID REFERENCES roles(id)                  ,
            is_active     BOOLEAN DEFAULT TRUE                       ,
            created_at    TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS role_permissions
        (
            role_id       UUID REFERENCES roles(id)      ,
            permission_id UUID REFERENCES permissions(id),
            PRIMARY KEY ( role_id, permission_id )
        )
    ;
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS sessions
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id       UUID REFERENCES users(id)                  ,
            refresh_token TEXT NOT NULL                              ,
            device_name   VARCHAR(255)                               ,
            expires_at    TIMESTAMP NOT NULL                         ,
            created_at    TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'unique_role_permission'
        ) THEN
            ALTER TABLE role_permissions
                ADD CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id);
        END IF;
    END $$;