# telegram-message-scraper

Designed for extracting and processing message data, parsing it to get the mint address from @PumpEarly_AlertEN Telegram channel and forward it to @z99bot to get the token trade info. 

It utilizes web scraping techniques to fetch HTML content from a specified Telegram channel and parses relevant information such as message text, sender details, timestamps, and associated media.

It uses session based one time login to forward the mint to the trading bot.

## Installation

```bash
npm i @erenodaci/telegram-message-scraper
```

## Usage

Update the .env file with the apiId and apiHash

## Example Output

```javascript
New mints found: [ 'uoWQRnkqqzgDDiHsF5pWcR1ZFm3hLs9gRp7FEQApump' ]
Sending to @z99bot: "uoWQRnkqqzgDDiHsF5pWcR1ZFm3hLs9gRp7FEQApump"
Bot replied: 📊 **PIKAJEW (PJ)**
`uoWQRnkqqzgDDiHsF5pWcR1ZFm3hLs9gRp7FEQApump`
└📊 | 📊 **15s** | Search on 𝕏

📊$**0.00001287** __(+199%)__
📊**$12.7K** | 📊 **$15.6K**
📊**$6.3K** | 📊 **+199%** 📊 **60** 📊 **5**
📊**56** (total) | `Top 10:` **21**% 
 └**5**|**4.5**|**2**|**1.6**|**1.5**|**1.4**|**1.4**|**1.3**|**1.1**|**1.1**
`Top 10 in detail`
`User    |Entry  |Buy   |Sell  |Left  `
`1..yjc5 |4.3K   |50.0M |-     |50.0M 
2..FBBP |4.9K   |82.5M |82.5M |45.4M 
3..VEQi |9.2K   |20.2M |-     |20.2M 
4..Czkg |7.1K   |16.3M |-     |16.3M 
5..Z66W |11.4K  |14.9M |-     |14.9M 
6..maB5 |8.0K   |13.9M |-     |13.9M 
7..93Tr |6.5K   |13.8M |-     |13.8M 
8..16Cf |12.9K  |13.1M |-     |13.1M 
9..fG9h |6.1K   |11.4M |-     |11.4M 
10.dXnd |12.4K  |11.3M |-     |11.3M 
`

Dev:📊 __(5% left)__
 📊Made: **1**
 📊Dex Paid: 📊 | CTO: 📊
 `Buyers` 
 📊📊Insiders: **1**
 📊📊KOLs: **0**
 📊📊Sniper: 2 `buy` **9.6%** `with` **3.26 SOL**
 📊📊Bundle: 0 
 📊📊📊📊📊📊📊📊📊📊📊
 📊📊📊📊📊📊📊📊📊📊📊
 📊📊📊📊📊📊📊📊📊📊📊
 📊📊📊📊📊📊📊📊📊📊📊
 📊📊📊📊📊📊📊📊📊📊📊
 📊 📊 Hold 48 | 📊 Sold part 0 | 📊 Sold 2

📊 **MevX** • 📊PF • 📊DS • GM • PHO • AXI
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.
