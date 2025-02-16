const { convertToNGN } = require("../../../../utilities");
const { Navigation } = require("../../../navigation/navigationClass");

const { Settings } = require("../../settings/settingsClass");
exports.handleNairaPay = async (ctx) => {
    try {
      // Get the current option from the ctx
      const option = ctx.update.callback_query.message.text;
      const userId = Number(process.env.USER_ID);
      // Extract the dollar price from the option text
      const dollarPrice = option.replace(/(?:.*?\$)(\d+).*$/, "$1");
      const navigation = Navigation.getInstance();
      const NAIR_CURRENT_RATE = await Settings.getNairaPriceByUserId(userId);
      // console.log(NAIR_CURRENT_RATE,"NAIR_CURRENT_RATE")
      const defaultNgData = { conversion_rates: { NGN: NAIR_CURRENT_RATE } };
      const ngData = navigation?.nairaPrice || defaultNgData;
      // console.log(ngData,"ngData",navigation?.nairaPrice)
      // Check if ngData is defined
      if (ngData) {
        // Convert the dollar price to NGN using the convertToNGN function
        const result = await convertToNGN(dollarPrice, ngData);
        let amountInNGN = "Unknown";
        let flexibleExchangeRate = "Unknown";
        if (result) {
          amountInNGN = result.amountInNGN;
          flexibleExchangeRate = result.flexibleExchangeRate;
        }
        const formartedNairaPrice = String(amountInNGN).replace(
          /\B(?=(\d{3})+(?!\d))/g,
          ","
        );
        // Add a check to ensure dollarPrice is a valid number
        if (isNaN(dollarPrice)) {
          console.error("Error: dollarPrice is not a valid number", option);
          return;
        }
  
        const replyText = `
<strong>Naira Payment (Exclusive for Nigerians)</strong>

<i>Please make payment to the details below</i>

<blockquote>

Bank : UBA

Bank Name : <code>DOYEN WILSON EHIOKHAI</code>

Acc Number : <code>2142459793</code>

Amount : ${formartedNairaPrice} NGN

</blockquote>
<blockquote>
Current Exchange Rate: $1 USD = ${flexibleExchangeRate} NGN (Rate is subject to change)
</blockquote>

<i>Copy Account details and make payment and send screenshot of completed payment here then wait for confirmation.</i>`;
        const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
        const messageId = ctx.update.callback_query.message.message_id;
        await ctx.reply(replyText, {
          reply_markup: {
            inline_keyboard: buttons,
          },
          parse_mode: "HTML",
        });
  
        // Update callback info
        navigation.updateCallbackInfo(
          ctx,
          "Naira Payment",
          messageId
        );
        // Clear session storage
        ctx.session = null;
      } else {
        console.error("Error: ngData is undefined");
        const replyText = `<i>Unable to retrieve NGN exchange rate. Please try again later. Our team is working hard to resolve this issue.</i>`;
        const replyMsg = await ctx.reply(replyText, { parse_mode: "HTML" });
        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(replyMsg?.chat?.id, replyMsg.message_id);
          } catch (error) {
            console.error("Error deleting reply message:", error);
          }
        }, 5000);
      }
    } catch (error) {
      console.error("Error in Naira Payment:", error);
    }
  };