const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const fs = require("fs");
const path = require("path");
require('dotenv').config();


const apiId = Number(process.env.apiId);
const apiHash = process.env.apiHash;
const botUsername = process.env.botUsername;

console.log("values", apiId, apiHash, botUsername)

const sessionFile = path.join(__dirname, "../telegram.session");

// Load saved session if exists
let savedSession = "";
if (fs.existsSync(sessionFile)) {
  savedSession = fs.readFileSync(sessionFile, "utf8");
}
const stringSession = new StringSession(savedSession);


const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

async function telegram_session(){

  try{

      // Connect and authenticate if needed
      if (!savedSession) {
        console.log("First run - authenticating...");
        await client.start({
          phoneNumber: async () => prompt("Enter your phone number (+1234567890): "),
          password: async () => prompt("Enter your 2FA password (if any): "),
          phoneCode: async () => prompt("Enter the OTP code you received: "),
          onError: (err) => console.error("Auth error:", err),
        });
        
        // Save session for future use
        const newSession = client.session.save();
        fs.writeFileSync(sessionFile, newSession, "utf8");
        console.log("Session saved for future logins");

        return

      } else {
        console.log("restoring session...");
        await client.connect();

        return
      }

  }catch(error){

    console.log(error);

  }

}

async function get_mint_market_data(mint){

  try {

    let botResponse = null;

    const responsePromise = new Promise((resolve) => {
      client.addEventHandler(
        async (event) => {
          const message = event.message;
          if (message.senderId && (await client.getEntity(botUsername)).id.equals(message.senderId)) {
            botResponse = message.text;
            console.log("Bot replied:", botResponse);
            resolve(botResponse);
          }
        },
        new NewMessage({})
      );
    });

    // Send message and wait for response
    console.log(`Sending to ${botUsername}: "${mint}"`);
    await client.sendMessage(botUsername, { message: mint });
    
    // Wait for response with 30s timeout
    await Promise.race([
      responsePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for bot response")), 30000))
    ]);

  } catch (err) {
    console.error("Error:", err.message);
  }
}


// Helper function for input prompts
function prompt(question) {
  return new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

module.exports = { get_mint_market_data, telegram_session, client }