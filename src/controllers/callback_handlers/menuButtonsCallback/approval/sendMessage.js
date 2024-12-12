// /src/controllers/callback_handlers/menuButtonsCallback/payment/approval/sendMessage.js

const { Navigation } = require("../../../navigation/navigationClass");
exports.sendMessage = async (ctx, userId, messageText, inlineKeyboard) => {
  const inviteLinkId = await ctx.api.sendMessage(userId, messageText, {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  });

  const navigation = Navigation.getInstance();
  navigation.userMenuOptions.set(userId, {
    ...navigation.userMenuOptions.get(userId),
    inviteLinkId: inviteLinkId.message_id, 
  });
};