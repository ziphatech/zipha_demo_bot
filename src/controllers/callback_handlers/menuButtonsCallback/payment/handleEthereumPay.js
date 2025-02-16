const { Navigation } = require("../../../navigation/navigationClass");

exports.handleEthereumPay = async (ctx) => {
    try {
      const navigation = Navigation.getInstance()
      const messageId = ctx.update.callback_query.message.message_id;
      // Handle Coinbase Pay option
      const replyText = `<b>Please make payment to the address below</b>\n\n
<i>Ethereum Payment</i>

<blockquote>

Address: <code> 0x1b0f6181caaea9c86822fb3795930c1a0c4d317a</code>

Network: <b>( ERC20 )</b>

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
     navigation.updateCallbackInfo(ctx, "ERC", messageId);

    } catch (error) {
      console.error("Error in handleBtcPay:", error);
    }
  };