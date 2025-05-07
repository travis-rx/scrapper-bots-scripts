import asyncio
from twikit import Client, TooManyRequests, AccountLocked
from datetime import datetime
import csv
from configparser import ConfigParser
from random import randint
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MINIMUM_TWEETS = 10
QUERY = '(from:gmgnalerts) lang:en'
# QUERY = 'gmgn lang:en'


async def get_tweets(client, tweets):
    try:
        if tweets is None:
            logger.info('Getting initial tweets...')
            tweets = await client.search_tweet(QUERY, 'Top')
        else:
            wait_time = randint(5, 10)
            logger.info(f'Waiting {wait_time} seconds before next request...')
            await asyncio.sleep(wait_time)
            tweets = await tweets.next()
        return tweets
    except Exception as e:
        logger.error(f"Error getting tweets: {str(e)}")
        raise

async def initialize_client():
    # Load credentials
    config = ConfigParser()
    config.read('config.ini')
    username = config['X']['username']
    email = config['X']['email']
    password = config['X']['password']

    # Initialize client
    client = Client(language='en-US')
    
    try:
        # Try loading cookies first
        client.load_cookies('cookies.json')
        logger.info("Loaded cookies successfully")
    except FileNotFoundError:
        logger.info("No cookies file found, logging in with credentials...")
        try:
            await client.login(
                auth_info_1=username,
                auth_info_2=email,
                password=password
            )
            await client.save_cookies('cookies.json')
            logger.info("Logged in and saved cookies successfully")
        except AccountLocked:
            logger.error("Account is locked. Please unlock it at https://x.com/account/access")
            return None
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            return None
    
    return client

async def main():
    client = await initialize_client()
    if not client:
        return

    # Prepare CSV file
    with open('tweets.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Tweet_count', 'Username', 'Text', 'Created At', 'Retweets', 'Likes'])

    tweet_count = 0
    tweets = None

    while tweet_count < MINIMUM_TWEETS:
        try:
            tweets = await get_tweets(client, tweets)
            
            if not tweets:
                logger.info('No more tweets found')
                break

            for tweet in tweets:
                tweet_count += 1
                tweet_data = [
                    tweet_count,
                    tweet.user.name,
                    tweet.text.replace('\n', ' '),
                    tweet.created_at,
                    tweet.retweet_count,
                    tweet.favorite_count
                ]
                
                with open('tweets.csv', 'a', newline='', encoding='utf-8') as file:
                    writer = csv.writer(file)
                    writer.writerow(tweet_data)

            logger.info(f'Collected {tweet_count} tweets')

        except TooManyRequests as e:
            rate_limit_reset = datetime.fromtimestamp(e.rate_limit_reset)
            wait_time = max(0, (rate_limit_reset - datetime.now()).total_seconds())
            logger.warning(f'Rate limited. Waiting {wait_time:.1f} seconds...')
            await asyncio.sleep(wait_time)
            continue
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            break

    logger.info(f'Finished. Total tweets collected: {tweet_count}')

if __name__ == '__main__':
    asyncio.run(main())