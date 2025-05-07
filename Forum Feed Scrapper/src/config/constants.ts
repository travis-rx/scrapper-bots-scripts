import dotenv from 'dotenv';
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const CHANNEL_ID = process.env.CHANNEL_ID;

export const ERROR_REPORT_CHAT_ID = process.env.ERROR_REPORT_CHAT_ID;
export const ERROR_CONFIG = {
    THRESHOLD: 5,
    TIMEFRAME: 1000 * 60 * 60 * 24
};
