CREATE EXTENSION
IF NOT EXISTS "uuid-ossp";
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS roles
        (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name        VARCHAR(100) NOT NULL UNIQUE               ,
            "createdAt" TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS permissions
        (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name        VARCHAR(100) NOT NULL UNIQUE               ,
            "createdAt" TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS users
        (
            id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name           VARCHAR(255) NOT NULL                      ,
            email          VARCHAR(255) UNIQUE NOT NULL               ,
            "passwordHash" TEXT NOT NULL                              ,
            "roleId"       UUID REFERENCES roles(id) ON
            DELETE
            SET
                NULL ON
            UPDATE
                CASCADE                             ,
                "isActive" BOOLEAN DEFAULT TRUE      ,
                "createdAt" TIMESTAMP DEFAULT NOW()  ,
                "tokenVersion" INTEGER DEFAULT 0 );
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS role_permissions
        (
            "roleId" UUID REFERENCES roles(id) ON
            DELETE
                CASCADE ON
            UPDATE
                CASCADE,
                "permissionId" UUID REFERENCES permissions(id) ON
            DELETE
                CASCADE ON
            UPDATE
                CASCADE,
                PRIMARY KEY ("roleId", "permissionId") );
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS sessions
        (
            id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "userId"  UUID REFERENCES users(id) ON
            DELETE
                CASCADE ON
            UPDATE
                CASCADE                        ,
                "refreshToken" TEXT NOT NULL   ,
                "deviceName" VARCHAR(255)      ,
                "expiresAt" TIMESTAMP NOT NULL ,
                "createdAt" TIMESTAMP DEFAULT NOW() );
    ---------------------------------------------------
    DO $$
    BEGIN
        IF NOT EXISTS
            (
                SELECT
                    1
                FROM
                    pg_constraint
                WHERE
                    conname = 'unique_role_permission' )
        THEN
            ALTER TABLE role_permissions
                ADD CONSTRAINT unique_role_permission UNIQUE
                    (
                        "roleId",
                        "permissionId"
                    )
            ;
        END
        IF;
        END $$;
