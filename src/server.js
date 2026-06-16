// src/server.js
require("dotenv").config();
const createApp = require("./app/createApp");
const PostgresClient = require(
    "./infrastructure/postgres/PostgresClient"
);

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    try {
        const db = PostgresClient.getInstance();

        await db.connect();

        const app = createApp();

        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

bootstrap();