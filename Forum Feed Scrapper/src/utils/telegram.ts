import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { BOT_TOKEN } from '../config/constants';

const botToken = BOT_TOKEN;

if (!botToken) {
  throw new Error("BOT_TOKEN is not defined in the environment variables");
}

export const bot = new TelegramBot(botToken, { polling: true });


