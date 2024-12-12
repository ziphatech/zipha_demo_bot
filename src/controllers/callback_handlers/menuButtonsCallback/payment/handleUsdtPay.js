const { Navigation } = require("../../../navigation/navigationClass");

exports.handleUsdtPay = async (ctx) => {
  const navigation = Navigation.getInstance()
  const messageId = ctx.update.callback_query.message.message_id;
    try {
      const replyText = ` <strong>Please make payment to any of the addresses below</strong>
  
  <i>USDT Payment:</i>
  
  <blockquote>
  
  Address: <code> TTMurcF3176rJ9pRU7SneJ2Y2CAYHyxnSB </code>
  
  Network: <b>( TRC20 )</b>
  
  Address: <code> 0x1b0f6181caaea9c86822fb3795930c1a0c4d317a</code>
  
  Network: <b>( ERC20 )</b>
  
  Address: <code>0x1b0f6181caaea9c86822fb3795930c1a0c4d317a</code>
  
  Network: <b>BSC(BEP20)</b>
  
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