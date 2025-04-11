const catchMechanismClass = require("../../../../config/catchMechanismClass");
const { default: mongoose } = require("mongoose");
const catchMechanismClassInstance = catchMechanismClass.getInstance(mongoose.connection);
const screenshotStorage = require("../../../navigation/screenshotStorageClass");
const Broadcast = require("../../../navigation/broadcast_singleton");
const { sendError } = require("../sendErrorMessage");


exports.appealCallback = async function appealCallback(ctx, userId, action, messageIdCount) {
  try {
    if (!ctx.update.callback_query || !ctx.update.callback_query.message) {
      throw new Error("Callback query or its message is undefined");
    }

    const messageId = ctx.update.callback_query.message.message_id;
    
    const broadcast = Broadcast(); // Assuming Broadcast is a factory function or class instance
    const userStorage = await screenshotStorage.getUserStorage(userId);
    if (!userStorage) {
      await catchMechanismClassInstance.initialize();
    }

    const screenshotData = await screenshotStorage.getScreenshot(userId);
    if (!screenshotData || !screenshotData.screenshots?.[messageIdCount]) {
      return sendError(ctx, "Screenshot data not found.");
    }

    const { username, screenshots } = screenshotData;
    const screenshot = screenshots[messageIdCount]; // get correct index

    const photoId = screenshot.photoId;
    const messageID = screenshot.messageId;

    broadcast.active = true;
    broadcast.message = ctx.update.callback_query.message;
    broadcast.userId = {
      userID: userId,
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
      return sendError(ctx, "Sorry, something went wrong. Please try again later.");
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await ctx.api.deleteMessage(replyAppeal.chat.id, replyAppeal.message_id);

  } catch (error) {
    console.error(`Error in appealCallback: ${error.message}`);
    sendError(ctx, `Error in appealCallback: ${error.message}`);
  }
};

