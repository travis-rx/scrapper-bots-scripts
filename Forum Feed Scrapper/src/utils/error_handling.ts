import { bot } from './telegram';

// Error tracking configuration
const ERROR_CONFIG = {
    THRESHOLD: 5,
    TIMEFRAME: 60_000, // 60 seconds in milliseconds
    REPORT_CHAT_ID: process.env.ERROR_REPORT_CHAT_ID, // Optional: Add to .env for Telegram error reporting
};

// Error state management class
class ErrorTracker {
    private uncaughtCount: number = 0;
    private rejectionCount: number = 0;
    private firstUncaughtTime: number | null = null;
    private firstRejectionTime: number | null = null;
    private lastErrorMessage: string = '';

    reset(): void {
        this.uncaughtCount = 0;
        this.rejectionCount = 0;
        this.firstUncaughtTime = null;
        this.firstRejectionTime = null;
        this.lastErrorMessage = '';
    }

    incrementUncaught(): number {
        const now = Date.now();
        if (!this.firstUncaughtTime) this.firstUncaughtTime = now;
        this.uncaughtCount++;
        return this.uncaughtCount;
    }

    incrementRejection(): number {
        const now = Date.now();
        if (!this.firstRejectionTime) this.firstRejectionTime = now;
        this.rejectionCount++;
        return this.rejectionCount;
    }

    shouldResetUncaught(now: number): boolean {
        return this.firstUncaughtTime !== null && 
               (now - this.firstUncaughtTime) > ERROR_CONFIG.TIMEFRAME;
    }

    shouldResetRejection(now: number): boolean {
        return this.firstRejectionTime !== null && 
               (now - this.firstRejectionTime) > ERROR_CONFIG.TIMEFRAME;
    }

    shouldExitUncaught(): boolean {
        return this.uncaughtCount >= ERROR_CONFIG.THRESHOLD;
    }

    shouldExitRejection(): boolean {
        return this.rejectionCount >= ERROR_CONFIG.TIMEFRAME;
    }

    setLastError(message: string): void {
        this.lastErrorMessage = message;
    }

    getLastError(): string {
        return this.lastErrorMessage;
    }
}

const errorTracker = new ErrorTracker();

function setupErrorHandling() {
    // Helper function to report errors
    const reportError = async (type: string, message: string) => {
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
    async function gracefulShutdown(exitCode: number) {
        console.log('Initiating graceful shutdown...');
        try {
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
            await gracefulShutdown(0);
        });
    }

    // Log successful setup
    console.log('Error handling setup completed');
}

// Export utility function to get last error
export function getLastError(): string {
    return errorTracker.getLastError();
}

export { setupErrorHandling };