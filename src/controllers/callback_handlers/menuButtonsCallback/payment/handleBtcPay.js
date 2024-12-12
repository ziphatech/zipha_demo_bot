const { Navigation } = require("../../../navigation/navigationClass");

exports.handleBtcPay = async (ctx) => {
    try {
      const navigation = Navigation.getInstance()
      const messageId = ctx.update.callback_query.message.message_id;
      // Handle Coinbase Pay option
      const replyText = `<b>Please make payment to the addresses below</b>\n\n
  <i>BTC Payment</i>
  
  <blockquote>
  <strong>BTC Address</strong> : <code>1E5vFKzgBv9jWH2oXAyJ9Lbnrnh9EvuJgW</code>
  </blockquote>
  <i>Copy address and make payment and send screeshot of completed payment and wait for confirmation</i>
  `;
      const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
      await ctx.reply(replyText, {
        reply_markup: {
          inline_keyboard: buttons,
        },
        parse_mode: "HTML",
      });
  
      // Update callback info
      navigation.updateCallbackInfo(ctx, "BTC", messageId);

    } catch (error) {
      console.error("Error in handleBtcPay:", error);
    }
  };