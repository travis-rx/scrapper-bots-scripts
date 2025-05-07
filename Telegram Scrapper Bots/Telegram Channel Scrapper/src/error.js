const { client } = require('./telegram');

// Error tracking configuration
const ERROR_CONFIG = {
    THRESHOLD: 5,
    TIMEFRAME: 60_000, 
    REPORT_CHAT_ID: process.env.ERROR_REPORT_CHAT_ID, // Optional: Add to .env for Telegram error reporting
};

// Error state management class
class ErrorTracker {
    constructor() {
        // These cannot be changed after initialization
        Object.defineProperties(this, {
            uncaughtCount: { value: 0, writable: false },
            rejectionCount: { value: 0, writable: false },
            firstUncaughtTime: { value: null, writable: false },
            firstRejectionTime: { value: null, writable: false },
            lastErrorMessage: { value: '', writable: false }
        });
    }

    reset() {
        this.uncaughtCount = 0;
        this.rejectionCount = 0;
        this.firstUncaughtTime = null;
        this.firstRejectionTime = null;
        this.lastErrorMessage = '';
    }

    incrementUncaught() {
        const now = Date.now();
        if (!this.firstUncaughtTime) this.firstUncaughtTime = now;
        this.uncaughtCount++;
        return this.uncaughtCount;
    }

    incrementRejection() {
        const now = Date.now();
        if (!this.firstRejectionTime) this.firstRejectionTime = now;
        this.rejectionCount++;
        return this.rejectionCount;
    }

    shouldResetUncaught(now) {
        return this.firstUncaughtTime !== null && 
               (now - this.firstUncaughtTime) > ERROR_CONFIG.TIMEFRAME;
    }

    shouldResetRejection(now) {
        return this.firstRejectionTime !== null && 
               (now - this.firstRejectionTime) > ERROR_CONFIG.TIMEFRAME;
    }

    shouldExitUncaught() {
        return this.uncaughtCount >= ERROR_CONFIG.THRESHOLD;
    }

    shouldExitRejection() {
        return this.rejectionCount >= ERROR_CONFIG.TIMEFRAME;
    }

    setLastError(message) {
        this.lastErrorMessage = message;
    }

    getLastError() {
        return this.lastErrorMessage;
    }
}

const errorTracker = new ErrorTracker();

function setupErrorHandling() {
    // Helper function to report errors
    const reportError = async (type, message) => {
        console.error(message);
        errorTracker.setLastError(message);
        
        if (ERROR_CONFIG.REPORT_CHAT_ID) {
            try {
                await bot.sendMessage(
                    ERROR_CONFIG.REPORT_CHAT_ID,
                    `${type}: ${message.slice(0, 4000)}`, // Telegram message length limit
                    { parse_mode: 'Markdown' }
                );
            } catch (telegramError) {
                console.error('Failed to send error report to Telegram:', telegramError);
            }
        }
    };

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
        const now = Date.now();
        
        await client.disconnect();
        console.log("Disconnected");

        if (errorTracker.shouldResetUncaught(now)) {
            errorTracker.reset();
        }

        const count = errorTracker.incrementUncaught();
        const errorMessage = `Uncaught exception #${count}: ${error.stack || error.message}`;
        
        await reportError('Uncaught Exception', errorMessage);

        if (errorTracker.shouldExitUncaught()) {
            await reportError('Critical', 'Too many uncaught exceptions, shutting down...');
            await gracefulShutdown(1);
        }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
        const now = Date.now();

        await client.disconnect();
        console.log("Disconnected");
        
        if (errorTracker.shouldResetRejection(now)) {
            errorTracker.reset();
        }

        const count = errorTracker.incrementRejection();
        const errorMessage = `Unhandled rejection #${count} at Promise: ${promise}\nReason: ${reason instanceof Error ? reason.stack : String(reason)}`;
        
        await reportError('Unhandled Rejection', errorMessage);

        if (errorTracker.shouldExitRejection()) {
            await reportError('Critical', 'Too many unhandled rejections, shutting down...');
            await gracefulShutdown(1);
        }
    });

    // Graceful shutdown handler
    async function gracefulShutdown(exitCode) {
        console.log('Initiating graceful shutdown...');
        
        try {
            await client.disconnect();
            console.log("Disconnected");
            await bot.stopPolling();
            console.log('Bot polling stopped successfully');
        } catch (error) {
            console.error('Error stopping bot polling:', error);
        }
        process.exit(exitCode);
    }

    // Process termination handlers
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, async () => {
            console.log(`Received ${signal}, shutting down...`);
            await client.disconnect();
            console.log("Disconnected");
            await gracefulShutdown(0);
        });
    }
}

// Export utility function to get last error
function getLastError() {
    return errorTracker.getLastError();
}

module.exports = { setupErrorHandling, getLastError };