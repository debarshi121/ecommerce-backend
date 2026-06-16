// src/app/registerRoutes.js

const PostgresClient = require(
    "../infrastructure/postgres/PostgresClient"
);

function registerRoutes(app) {

    app.get("/health", async (req, res) => {
        try {
            const db = PostgresClient.getInstance();

            const result = await db.query(
                "SELECT NOW()"
            );

            return res.status(200).json({
                success: true,
                dbTime: result.rows[0].now
            });

        } catch (error) {
            return res.status(500).json({
                success: false
            });
        }
    });
}

module.exports = registerRoutes;