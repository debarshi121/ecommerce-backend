CREATE EXTENSION
IF NOT EXISTS "uuid-ossp";
    ---------------------------------------------------
    CREATE TABLE roles
        (
            id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name       VARCHAR(100) NOT NULL UNIQUE               ,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE permissions
        (
            id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name       VARCHAR(100) NOT NULL UNIQUE               ,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE users
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
    CREATE TABLE role_permissions
        (
            role_id       UUID REFERENCES roles(id)      ,
            permission_id UUID REFERENCES permissions(id),
            PRIMARY KEY ( role_id, permission_id )
        )
    ;
    ---------------------------------------------------
    CREATE TABLE sessions
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id       UUID REFERENCES users(id)                  ,
            refresh_token TEXT NOT NULL                              ,
            device_name   VARCHAR(255)                               ,
            expires_at    TIMESTAMP NOT NULL                         ,
            created_at    TIMESTAMP DEFAULT NOW()
        );