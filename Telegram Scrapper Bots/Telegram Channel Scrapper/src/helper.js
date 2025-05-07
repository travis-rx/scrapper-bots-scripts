function extractMintAddress(message) {
    const regex = /💊\s*([^|]+)\s*\|\s*Pump Chart/;
    const match = message.match(regex);
    return match ? match[1].trim() : null;
}

module.exports = { extractMintAddress }