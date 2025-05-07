# Scraping `X.com` with Twikit

# If you face issue running the script on linux

python3 -m venv .venv

source .venv/bin/activate

This code use [Twikit](https://github.com/d60/twikit) to scrape Tweet data. To run the code, use 
`pip install “twikit==1.7.6”` to install the _twikit_ package. The latest update of _twikit_ 
deprecated the synchronous method which is used in the code.