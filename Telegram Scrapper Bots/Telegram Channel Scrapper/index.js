const sanitizeHtml = require("sanitize-html");
const { setupErrorHandling } = require("./src/error");  
const { get_mint_market_data, telegram_session} = require('./src/telegram');
const { extractMintAddress } = require('./src/helper');

(async() => {

   telegram_session();

})();

setupErrorHandling();


let mints = []

async function TelegramMessageScraper(channelName) {
   function cleanText(item) {
      return sanitizeHtml(item, {
         allowedTags: [],
         allowedAttributes: {},
      });
   }
   function getUserImage(html) {
      const regex = /<img src="(.*?)"/g;
      return regex.exec(html)?.[1];
   }
   function getUserLink(html) {
      const regex = /<a class="tgme_widget_message_owner_name" href="(.*?)"/g;
      return regex.exec(html)?.[1];
   }
   function getUserName(html) {
      const regex = /<span dir="auto">(.*?)<\/span>/g;
      return regex.exec(html)?.[1];
   }
   function getMessageDate(html) {
      const regex = /<time datetime="(.*?)"/g;
      return regex.exec(html)?.[1];
   }
   function getImage(html) {
      const regex = /url\('(.*?)'/g;
      return regex.exec(html)?.[1];
   }
   function getMessage(html) {
      const regex =
         /<div class="tgme_widget_message_text js-message_text" dir="auto">(.*?)<\/div>/g;
      return cleanText(regex.exec(html)?.[1]);
   }
   function getViews(html) {
      const regex = /<span class="tgme_widget_message_views">(.*?)<\/span>/g;
      return regex.exec(html)?.[1];
   }
   function getActionLink(html) {
      const regex =
         /<a class="tgme_widget_message_inline_button url_button" href="(.*?)"/g;
      return regex.exec(html)?.[1];
   }
   
   async function getChannelMessages(channelName) {

      try{

      const url = `https://t.me/s/${channelName}`;
      const result = await fetch(url);
      const data = await result.text();

      if (data.indexOf("tgme_channel_history js-message_history") === -1) {
         console.error("Channel not found");
         return null;
      }

      const messageContainer = data.split('class="tgme_widget_message_user">');
      messageContainer.shift();

      const messages = [];
      messageContainer.forEach((message) => {
         messages.push({
            userName: getUserName(message),
            userImage: getUserImage(message),
            userLink: getUserLink(message),
            date: getMessageDate(message),
            message: getMessage(message),
            image: getImage(message),
            views: getViews(message),
            actionLink: getActionLink(message),
         });
      });

      return messages;

   }catch(error){

      console.log(error);

      return null
   }
   }

   return await getChannelMessages(channelName);
}


setInterval(() => {
(async () => {
   try {
       const messages = await TelegramMessageScraper("PumpEarly_AlertEN");
      //  console.log(messages);

      if(!messages){ return }

// messages.forEach(msg => {
//    const mintAddress = extractMintAddress(msg.message);
//    console.log(`Message Date: ${msg.date}`);
//    console.log(`Token: ${msg.message.split(' ')[0]}`); // Gets the token name (first word)
//    console.log(`Mint Address: ${mintAddress}`);
//    console.log('---');
// });

// const allMintAddresses = messages.map(msg => extractMintAddress(msg.message));
// console.log('All mint addresses:', allMintAddresses.filter(Boolean));

const allMintAddresses = messages.map(msg => extractMintAddress(msg.message)).filter(Boolean);
// console.log('All mint addresses:', allMintAddresses);

if (mints.length === 0) {
    mints = allMintAddresses.slice(0, 20);
    
} else {
    const newMints = allMintAddresses.filter(mint => 
        !mints.includes(mint)
    );

    if (newMints.length > 0) {
        console.log('New mints found:', newMints);
        
         newMints.forEach((mint, index) => {
            setTimeout(() => {
            get_mint_market_data(mint);
               }, index * 1000); 
            });

        mints = [...newMints, ...mints];
        
        if (mints.length > 20) {
            mints = mints.slice(0, 20);
        }
        
    } else {
        console.log('No new mints found');
    }
}
   } catch (error) {
       console.error("Error:", error);
   }
})();

}, 10000); 

