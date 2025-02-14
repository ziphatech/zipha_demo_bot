const { Navigation } = require("../../../navigation/navigationClass");

exports.handleUsdtPay = async (ctx) => {
  const navigation = Navigation.getInstance()
  const messageId = ctx.update.callback_query.message.message_id;
    try {
      const replyText = ` <strong>Please make payment to the the address below</strong>

<i>USDT Payment:</i>

<blockquote>

Address: <code> TT35dpdvCTtXvzpUahyzGexskiS1Q2FRkn </code>

Network: ( TRC20 )

Address: <code> 0xf6441bd3c66750ac3f9d27b7bc2bf4629bca2af2</code>

Network: ( ERC20 )

</blockquote>
<i>Copy address and make payment and send screeshot of completed payment here then wait for confirmation.</i>
        `;
      const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
  
      await ctx.reply(replyText, {
        reply_markup: {
          inline_keyboard: buttons,
        },
        parse_mode: "HTML",
      });
      // Update callback info
      navigation.updateCallbackInfo(ctx, "USDT", messageId);
      
    } catch (error) {
      console.error("Error in handleUsdtPay:", error);
    }
  };