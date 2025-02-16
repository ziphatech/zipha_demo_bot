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
    }
    // Handle photo messages
    else if (message.photo) {
      const userId = ctx.from?.id;
      const username = ctx.from?.username;

      // Check if paymentType is set
      const paymentOption = await screenshotStorage?.getPaymentOption(userId);
      const paymentType = await screenshotStorage?.getPaymentType(userId);
      const serviceOption = await screenshotStorage?.getServiceOption(userId);
      const normalizedPaymentOption = paymentOption?.replace(/-.*/, "").trim();
      const normalizedPaymentType = (paymentType || "").trim();

      // Verify user ID existence
      if (!userId) {
        await handleErrorMessage(
          ctx,
          message,
          "<i>🤦‍♂️ Sorry, we couldn't verify your user ID. Please restart the process by clicking on the Main Menu or contact support.</i>",
          10000
        );
        return;
      }

      // Verify username existence
      if (!username) {
        await handleErrorMessage(
          ctx,
          message,
          "<i>To continue, please add a username to your Telegram account. This will help us verify your identity. You can do this by going to Settings > Username.</i>",
          10000
        );
        return;
      }

      // Store user information before sending screenshot
      createUserInstance.setUserProperties(userId, username, ctx);
      createUserInstance.subscriptionStatus("inactive");

      // Save user data to database
      try {
        await createUserInstance.saveUserToDB();
      } catch (error) {
        await handleErrorMessage(
          ctx,
          message,
          "Error saving user data. Please try again later.",
          5000
        );
        return;
      }

      const photoId = message.photo[message.photo.length - 1].file_id;
      const messageId = message.message_id;
      const screenshotData = {
        photoId,
        messageId,
        username,
      };
      const userStorage = await screenshotStorage.addScreenshot(
        userId,
        screenshotData,
        serviceOption === "3 Days BootCamp" ? "BootCamp" : "Generic"
      );
      // console.log(serviceOption === "3 Days BootCamp" ? "BootCamp" : "Generic")
      if (!userStorage) {
        await handleErrorMessage(
          ctx,
          message,
          "Error storing screenshot data. Please try again.",
          5000
        );
        return;
      }

      // Define valid payment options based on service option
      let validPaymentOptions;
      if (serviceOption === "Vip Signal") {
        validPaymentOptions = paymentOptions.filter((option) =>
          option.includes("Month")
        );
      } else if (serviceOption === "Mentorship") {
        validPaymentOptions = ["Group Mentorship Fee", "1"];
      } else if (serviceOption === "3 Days BootCamp") {
        validPaymentOptions = ["Pay Fee: $79.99"];
      } else if (serviceOption === "Fund Management") {
        validPaymentOptions = paymentOptions.filter((option) =>
          option.includes("$10,000")
        );
      } else {
        await handleErrorMessage(
          ctx,
          message,
          "Invalid service option selected. Please select VIP Signal, Mentorship, Fund Management, or 3 Days Boot Camp.",
          5000
        );
        return;
      }

      const isValidPaymentType = paymentTypes.includes(normalizedPaymentType);
      const isValidPaymentOption = validPaymentOptions.includes(
        normalizedPaymentOption
      );

      if (!isValidPaymentOption) {
        if (serviceOption === "Mentorship") {
          await handleErrorMessage(
            ctx,
            message,
            `Please select a valid payment option for Mentorship: ${validPaymentOptions.join(
              ", "
            )}.`,
            5000
          );
        } else if (serviceOption === "Vip Signal") {
          await handleErrorMessage(
            ctx,
            message,
            `Please select a valid payment option for VIP Signal: ${validPaymentOptions.join(
              ", "
            )}.`,
            5000
          );
        } else if (serviceOption === "3 Days BootCamp") {
          await handleErrorMessage(
            ctx,
            message,
            `Please select a valid payment option for 3 Days Boot Camp: ${validPaymentOptions.join(
              ", "
            )}.`,
            5000
          );
        } else {
          await handleErrorMessage(
            ctx,
            message,
            `Please select valid payment option for ${serviceOption}: $10,000 - $49,000.`,
            5000
          );
        }
        return;
      }

      if (!isValidPaymentType) {
        await handleErrorMessage(
          ctx,
          message,
          "Payment type selection failed! \n\n<i>Possible reasons:</i>\n\n1. Network issues\n2. Technical difficulties\n3. Slow connection\n\n<i>Please retry:</i>\n\n1. Return to Main Menu\n2. Select payment type (e.g., USDT, BTC)\n3. Look for confirmation notification at the top of your screen.\n\n<i>Try again, we're here to assist! </i>",
          15000
        );
        return;
      }
      const caption = generateCaption(
        ctx,
        serviceOption,
        paymentOption,
        paymentType
      );
      const channelId = process.env.APPROVAL_CHANNEL_ID;
      const messageIdCount = await screenshotStorage.getMessageIdCount(userId);
      const inlineKeyboard = [
        [
          {
            text: "Approve",
            callback_data: `approve_${userId}_${messageIdCount - 1}`,
          },
        ],
        [
          {
            text: "Appeal",
            callback_data: `appeal_${userId}_${messageIdCount - 1}`,
          },
        ],
      ];

      const responseChannel = await retryApiCall(() =>
        ctx.api.sendPhoto(channelId, photoId, {
          caption,
          reply_markup: { inline_keyboard: inlineKeyboard },
          parse_mode: "HTML",
        })
      );

      const responsePayment = await retryApiCall(() =>
        ctx.reply(
          "Payment screenshot sent for verification. Please wait for approval.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Go Back", callback_data: "goback"}],
              ],
            },
          }
        )
      );

      const channelMessageId = responseChannel.message_id;
      const paymentMessageId = responsePayment.message_id;
      await screenshotStorage.updateChannelAndPaymentMessageId(
        userId,
        channelMessageId,
        paymentMessageId
      );
      await catchMechanismClassInstance.addCatchMechanism(userId);
    }
  } catch (error) {
    await handleError(ctx, error);
  }
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
