import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
import { bot } from './src/utils/telegram';
import { setupErrorHandling } from './src/utils/error_handling';
import axios from 'axios';

setupErrorHandling();

const CHANNEL_ID = process.env.CHANNEL_ID || '';

if (!CHANNEL_ID) {
    throw new Error("CHANNEL_ID is not defined in the environment variables");
}

const url = 'https://iconstudies.com';

interface StudyData {
    studyNumber: string;
    title: string;
    description: string;
    compensation: string;
    location: string;
    details: string;
    age: string;
    link: string;
    isNew: boolean;
}

// Global Set to store already sent study numbers
const sentStudyNumbers = new Set<string>();

class WebScraper {
    private url: string;
    private seenPosts: Set<string> = new Set();
    private static isFirstRun: boolean = true; // Static flag to track the first run

    constructor(url: string) {
        this.url = url;
    }

    private async getPageContent(): Promise<string | null> {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching page:', error);
            return null;
        }
    }

    private parseStudies(htmlContent: string | null): StudyData[] {
        if (!htmlContent) return [];

        const $ = cheerio.load(htmlContent);
        const studies = $('.studies-card');
        const newStudies: StudyData[] = [];

        studies.each((_, element) => {
            const studyContent = $(element).html() || '';
            const studyHash = createHash('md5').update(studyContent).digest('hex');

            if (!this.seenPosts.has(studyHash)) {
                const studyData = this.extractStudyData($, element);
                newStudies.push(studyData);
                this.seenPosts.add(studyHash);

                // Maintain the seenPosts set with a maximum of 100 entries
                if (this.seenPosts.size > 100) {
                    const iterator = this.seenPosts.values();
                    const value = iterator.next().value;
                    if (value) {
                        this.seenPosts.delete(value);
                    }
                }
            }
        });

        return newStudies;
    }

    private extractStudyData($: cheerio.Root, study: cheerio.Element): StudyData {
        const getText = (selector: string): string =>
            $(selector, study).text().trim() || 'N/A';

        return {
            studyNumber: getText('.studies-card__number-inner'),
            title: getText('.studies-card__title'),
            description: getText('.studies-card__description'),
            compensation: getText('.studies-card__price'),
            location: getText('.studies-card__location-text'),
            details: getText('.studies-card__details'),
            age: getText('.studies-card__age'),
            link: $('.studies-card__inner-link', study).attr('href')
                ? url + $('.studies-card__inner-link', study).attr('href')
                : 'N/A',
            isNew: $('.studies-card__marker-text', study).text().trim().toLowerCase() === 'new'
        };
    }

    public async scrape(): Promise<void> {
        console.log(`Starting scraper for ${this.url}`);

        try {
            const htmlContent = await this.getPageContent();
            const newStudies = this.parseStudies(htmlContent);

            if (newStudies.length > 0) {
                console.log(`\n[${new Date().toISOString()}] Found ${newStudies.length} new studies:`);

                for (const study of newStudies) {
                    // Check if the study number has already been sent
                    if (sentStudyNumbers.has(study.studyNumber)) {
                        console.log(`Study #${study.studyNumber} already sent. Skipping...`);
                        continue;
                    }

                    // Add the study number to the global Set
                    sentStudyNumbers.add(study.studyNumber);

                    // Skip sending messages on the first run
                    if (WebScraper.isFirstRun) {
                        console.log(`Study #${study.studyNumber} added to the set (first run).`);
                        continue;
                    }

                    const message = `*Study:* \`#${study.studyNumber}\`\n` +
                                    `*Title:* ${study.title}\n` +
                                    `*Description:* ${study.description}\n` +
                                    `*Compensation:* ${study.compensation}\n` +
                                    `*Location:* ${study.location}\n` +
                                    `*Details:* ${study.details}\n` +
                                    `*Age:* ${study.age}\n` +
                                    `*New:* ${study.isNew ? 'Yes' : 'No'}\n`;

                    const viewLink = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: `🔍 View Study`, 
                                        url: `${study.link}` 
                                    }
                                ]
                            ]
                        }
                    };

                    await bot.sendMessage(CHANNEL_ID, message, {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true,
                        ...viewLink
                    })
                    .catch((error: any) => {
                        console.error("Failed to send message:", error);
                        if (error.response && error.response.statusCode === 403) {
                            console.error("Bot was blocked by the user.");
                        } else if (error.response && error.response.statusCode === 400) {
                            console.error("Bad request. Possibly due to message formatting.");
                        } else {
                            console.error("An unexpected error occurred:", error);
                        }
                    });

                    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
                }
            } else {
                console.log("No new studies found.");
            }
        } catch (error) {
            console.error(`\nAn error occurred: ${error}`);
        } finally {
            // Mark the first run as complete
            WebScraper.isFirstRun = false;
        }
    }
}
