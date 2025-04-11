const catchMechanismClass = require("../../../config/catchMechanismClass");
const Coupon = require("../../../model/couponClass");
const { createUserInstance } = require("../../../model/userInfo_singleton");
const { retryApiCall, generateCaption } = require("../../../utilities");
const Broadcast = require("../../navigation/broadcast_singleton");
const { Navigation } = require("../../navigation/navigationClass");
const screenshotStorage = require("../../navigation/screenshotStorageClass");
const { handleGiftCoupon } = require("../settings/handleGiftCoupon");
const { settingsClass } = require("../settings/settingsClass");
const couponInstance = Coupon.getInstance();
const catchMechanismClassInstance = catchMechanismClass.getInstance();
const paymentOptions = [
  "$10,000",
  "$50,000",
  "Group Mentorship Fee",
  "1 - On - 1     Fee",
  "1 Month",
  "3 Months",
  "6 Months",
  "12 Months",
];
const paymentTypes = [
  "USDT",
  "Naira Payment",
  "BTC",
  "Foreign Payment",
  "Skrill Payment",
  "Ethereum Payment",
];
// Function to handle various types of messages
async function handleMessages(ctx) {
  const message = ctx?.message;
  const broadcast = Broadcast();
  const navigation = Navigation.getInstance()

  broadcast.userId = ctx?.chat.id;
  navigation.uniqueUser = ctx?.chat.id;
  const settings = settingsClass();

  try {
    // console.log(ctx?.message)
    // Handle text messages containing "@"
    if (message?.text?.includes("@")) {
      const enteredUsername = message.text.replace("@", "");

      if (ctx.update.callback_query) {
        await retryApiCall(() =>
          ctx.answerCallbackQuery({
            callback_query_id: ctx.update.callback_query.id,
            text: `Your username has been saved as: ${enteredUsername} channelId : ${message.chat.id}`,
            show_alert: true,
          })
        );
      }
    }
    // Handle start command
    else if (message?.text === "/start") {
      await navigation.goToMainMenu(ctx);
      await screenshotStorage.addUser(ctx.from?.id, ctx.from?.username);
      navigation.uniqueUser = ctx.from?.id;
    }
    // Handle other text messages
    else if (message?.text) {
      const settingMessage = settings.settingMessage;
      const CouponMessageSet = await couponInstance.getCouponMessageSet();
      const USER_ID = Number(process.env.USER_ID);
      if (settingMessage === true && ctx.chat?.id === USER_ID) {
        await retryApiCall(() => settings.getNewSettings(ctx));
      }
      if (CouponMessageSet === true) {
        // console.log(message.text,"code")
        await retryApiCall(() => handleGiftCoupon(ctx));
      }
    } else if (message?.photo) {
      await handlePhotoMessage(ctx, message);
    }
  } catch (error) {
    await handleError(ctx, error);
  }
}

async function handlePhotoMessage(ctx, message) {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await handleErrorMessage(ctx, message, "Could not verify user ID. Restart or contact support.", 10000);
    return;
  }

  if (!username) {
    await handleErrorMessage(ctx, message, "Please add a username in Telegram settings.", 10000);
    return;
  }

  createUserInstance.setUserProperties(userId, username, ctx);
  createUserInstance.subscriptionStatus("inactive");

  try {
    await createUserInstance.saveUserToDB();
  } catch (error) {
    await handleErrorMessage(ctx, message, "Error saving user data.", 5000);
    return;
  }

  const photoId = message.photo[message.photo.length - 1].file_id;
  const serviceOption = await screenshotStorage?.getServiceOption(userId);
  const messageId = message.message_id
  const userStorage = await screenshotStorage.addScreenshot(
    userId,
    { photoId, messageId, username },
    serviceOption === "3 Days BootCamp" ? "BootCamp" : "Generic"
  );

  if (!userStorage) {
    await handleErrorMessage(ctx, message, "Error storing screenshot data.", 5000);
    return;
  }

  let validPaymentOptions;
  switch (serviceOption) {
    case "Vip Signal":
      validPaymentOptions = paymentOptions.filter(option => option.includes("Month"));
      break;
    case "Mentorship":
      validPaymentOptions = ["Group Mentorship Fee", "1"];
      break;
    case "3 Days BootCamp":
      validPaymentOptions = ["Pay Fee: $79.99"];
      break;
    case "Fund Management":
      validPaymentOptions = paymentOptions.filter(option => option.includes("$10,000"));
      break;
    default:
      await handleErrorMessage(ctx, message, "Invalid service option selected.", 5000);
      return;
  }

  const paymentOption = await screenshotStorage?.getPaymentOption(userId);
  const paymentType = await screenshotStorage?.getPaymentType(userId);

  const normalizedPaymentOption = paymentOption?.replace(/-.*/, "").trim();
  const normalizedPaymentType = (paymentType || "").trim();

  if (!validPaymentOptions.includes(normalizedPaymentOption)) {
    await handleErrorMessage(ctx, message, `Invalid payment option for ${serviceOption}.`, 5000);
    return;
  }

  if (!paymentTypes.includes(normalizedPaymentType)) {
    await handleErrorMessage(ctx, message, "Invalid payment type.", 15000);
    return;
  }

  const caption = generateCaption(ctx, serviceOption, paymentOption, paymentType);
  const channelId = process.env.APPROVAL_CHANNEL_ID;

  const messageIdCount = await screenshotStorage.getMessageIdCount(userId);
  if (messageIdCount === null) {
    throw new Error("Message ID count is null, cannot proceed.");
  }

  const inlineKeyboard = [
    [{ text: "Approve", callback_data: `approve_${userId}_${messageIdCount - 1}` }],
    [{ text: "Appeal", callback_data: `appeal_${userId}_${messageIdCount - 1}` }],
  ];

  const responseChannel = await retryApiCall(() =>
    ctx.api.sendPhoto(channelId, photoId, {
      caption,
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: "HTML",
    })
  );

  const responsePayment = await retryApiCall(() =>
    ctx.reply("Payment screenshot sent for verification. Please wait for approval.", {
      reply_markup: { inline_keyboard: [[{ text: "Go Back", callback_data: "goback" }]] },
    })
  );

  await screenshotStorage.updateChannelAndPaymentMessageId(
    userId,
    messageId,
    responseChannel.message_id,
    responsePayment.message_id
  );

  await catchMechanismClassInstance.addCatchMechanism(userId);
}

async function handleErrorMessage(ctx, message, errorMessage, timeOut) {
  try {
    // Delete original message
    await retryApiCall(() =>
      ctx.api.deleteMessage(ctx.chat.id, message.message_id)
    );

    // Send error message
    const replyMessage = await retryApiCall(() =>
      ctx.reply(errorMessage, { parse_mode: "HTML" })
    );

    // Delete error message after 15 seconds
    setTimeout(async () => {
      try {
        await retryApiCall(() =>
          ctx.api.deleteMessage(ctx.chat.id, replyMessage.message_id)
        );
      } catch (error) {
        console.error("Error deleting reply message:", error);
      }
    }, timeOut);
  } catch (error) {
    // Log critical error
    console.error("Critical error handling error message:", error);
    handleError(ctx, "Critical error handling error message: " + error);
  }

  // Exit the function
  return;
}
async function handleErrorMessage(ctx, message, errorMessage, timeOut) {
  try {
    // Delete original message
    await retryApiCall(() =>
      ctx.api.deleteMessage(ctx.chat.id, message.message_id)
    );

    // Send error message
    const replyMessage = await retryApiCall(() =>
      ctx.reply(errorMessage, { parse_mode: "HTML" })
    );

    // Delete error message after 15 seconds
    setTimeout(async () => {
      try {
        await retryApiCall(() =>
          ctx.api.deleteMessage(ctx.chat.id, replyMessage.message_id)
        );
      } catch (error) {
        console.error("Error deleting reply message:", error);
      }
    }, timeOut);
  } catch (error) {
    // Log critical error
    console.error("Critical error handling error message:", error);
    handleError(ctx, "Critical error handling error message: " + error);
  }

  // Exit the function
  return;
}
// Function to handle different types of errors
async function handleError(ctx, error) {
  try {
    let errorMessage;

    if (error.response && error.response.status === 429) {
      errorMessage = "Servers busy! Try again later.";
    } else if (error.response && error.response.status === 400) {
      errorMessage = "Error with request. Try again!";
    } else if (error.message) {
      errorMessage = "Something went wrong. Try again!" + error;
    } else {
      errorMessage = "An unknown error occurred.";
      console.error("Unknown error:", error);
      // Consider sending to logging service or endpoint
    }

    const replyMessage = await retryApiCall(() =>
      ctx.reply(errorMessage, { parse_mode: "HTML" })
    );

    setTimeout(async () => {
      try {
        await retryApiCall(() =>
          ctx.api.deleteMessage(ctx.chat.id, replyMessage.message_id)
        );
      } catch (deleteError) {
        console.error("Error deleting reply message:", deleteError);
      }
    }, 5000);
  } catch (retryError) {
    console.error("Error handling retry:", retryError);
  }
}
module.exports = {
  handleMessages,
};
