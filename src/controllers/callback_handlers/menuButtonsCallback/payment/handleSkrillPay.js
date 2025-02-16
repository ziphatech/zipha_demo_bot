const { Navigation } = require("../../../navigation/navigationClass");

exports.handleSkrillPay = async (ctx) => {
    try {
      const navigation = Navigation.getInstance()
      const messageId = ctx.update.callback_query.message.message_id;
      // Handle Coinbase Pay option
      const replyText = `<b>Please make payment to the address below</b>\n\n
<i>Skrill Payment</i>

<blockquote>
<strong>Skrill Email</strong> : <code> vineedking@gmail.com</code>
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
      navigation.updateCallbackInfo(ctx, "Skrill Payment", messageId);

    } catch (error) {
      console.error("Error in handleBtcPay:", error);
    }
  };