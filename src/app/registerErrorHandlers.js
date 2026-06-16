// src/app/registerErrorHandlers.js

function registerErrorHandlers(app) {
    app.use((err, req, res, next) => {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    });
}

module.exports = registerErrorHandlers;