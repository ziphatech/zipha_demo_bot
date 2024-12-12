const catchMechanismClass = require("../../../../config/catchMechanismClass");
const catchMechanismClassInstance = catchMechanismClass.getInstance();
const screenshotStorage = require("../../../navigation/screenshotStorageClass");
const Broadcast = require("../../../navigation/broadcast_singleton");
const { sendError } = require("../sendErrorMessage");
exports.appealCallback = async (ctx, userId, action, messageIdCount) => {
  try {
    const messageId = ctx.update.callback_query.message.message_id;
    const broadcast = Broadcast(); // Assuming Broadcast is a class
    const userStorage = await screenshotStorage.getUserStorage(userId);
    if (!userStorage) {
      await catchMechanismClassInstance.initialize();
    }
    const screenshotData = await screenshotStorage.getScreenshot(userId);
    const userID = screenshotData.userId;
    const username = screenshotData.username;
    const photoId = screenshotData.photoIds[messageIdCount];
    const messageID = screenshotData.messageIds[messageIdCount];
    if (!screenshotData) {
      return sendError(ctx, "Screenshot data not found.");
    }

    broadcast.active = true;
    broadcast.message = ctx.update.callback_query.message;
    broadcast.userId = {
      userID,
      photoId,
      messageID,
      action,
    };
    broadcast.messageId = messageId;

    if (!ctx.chat) {
      return sendError(ctx, "Chat context not available.");
    }

    const replyAppeal = await ctx.reply(
      `Appeal will be sent to this @${username}. Enter your message.`,
      { parse_mode: "HTML" }
    );

    if (!replyAppeal.chat || !replyAppeal.chat.id) {
      return sendError(
        ctx,
        "Sorry, something went wrong. Please try again later."
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await ctx.api.deleteMessage(replyAppeal.chat.id, replyAppeal.message_id);
  } catch (error) {
    console.error(`Error in appealCallback: ${error.message}`);
    sendError(ctx, `Error in appealCallback: ${error.message}`);
  }
};
