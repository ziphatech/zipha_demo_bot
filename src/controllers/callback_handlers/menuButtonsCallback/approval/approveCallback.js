// /src/controllers/callback_handlers/menuButtonsCallback/payment/approval/approveCallback.js
const { default: mongoose } = require("mongoose");
const { getNewInviteLink } = require("./getNewInviteLink");
const { packageHandler } = require("./packageHandler");
const { createUserInstance } = require("../../../../model/userInfo_singleton");
const screenshotStorage = require("../../../navigation/screenshotStorageClass");
const catchMechanismClass = require("../../../../config/catchMechanismClass");
const catchMechanismClassInstance = catchMechanismClass.getInstance(
  mongoose.connection
);
const ALLOWED_PAYMENT_OPTIONS = {
  MENTORSHIP_PRICE_LIST: "mentorship_price_list",
  BOOTCAMP_PAYMENT: "bootcamp_payment",
  ONE_MONTH: "one_month",
  THREE_MONTHS: "three_months",
  SIX_MONTHS: "six_months",
  TWELVE_MONTHS: "twelve_months", 
};
exports.approveCallback = async (ctx, uniqueId) => {
  try {
    const {
      VIP_SIGNAL_ID: channelId,
      MENTORSHIP_CHANNEL_ID,
      BOOTCAMP_CHANNEL_ID,
      GOOGLE_DRIVE_LINK: googleDriveLink,
      ADMIN_ID,
    } = process.env;

    const {
      callback_query: {
        message: {
          message_id: messageId,
          chat: { id: chatId },
        },
        id: callbackQueryId,
      },
    } = ctx.update;

    const userStorage = await screenshotStorage.getUserStorage(uniqueId);
    if(!userStorage){
      await catchMechanismClassInstance.initialize();
    }
    if (!userStorage) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: "User  storage data not found.",
        show_alert: true,
      });
      console.error("User  storage data not found for userId:", uniqueId);
      return;
    }

    const subscriptionType = createUserInstance.getSubscriptionType();
    const { isExpired, isActive } = userStorage;
    const screenshotData = userStorage.screenshots.get(uniqueId);
    if (!screenshotData) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: "Error handling screenshot data.",
        show_alert: true,
      });
      return;
    }

    const { username, userId, package } = screenshotData;

    if (!messageId) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: "🤦‍♂️ Message ID not found!",
        parse_mode: "HTML",
        show_alert: true,
      });
      return;
    }

    // Input validation
    if (
      !channelId ||
      !MENTORSHIP_CHANNEL_ID ||
      !googleDriveLink ||
      !ADMIN_ID ||
      !BOOTCAMP_CHANNEL_ID
    ) {
      await ctx.reply(
        "🤦‍♂️ Configuration error! \n\n<i>Possible reasons:</i>\n\n1. Environment variables not set\n2. Technical issues\n3. Network problems\n\n<i>Contact support for assistance.</i>\n\n<i>We're here to help! 👉</i>",
        { parse_mode: "HTML" }
      );
      return;
    }

    if (!userId) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: `🤦‍♂️ User ID not set!`,
        parse_mode: "HTML",
        show_alert: true,
      });
      return;
    }

    if (!subscriptionType) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: `🤦‍♂️ Invalid payment option ${subscriptionType}!`,
        parse_mode: "HTML",
        show_alert: true,
      });
      return;
    }
    // Generate the new invite link
    switch (subscriptionType) {
      case ALLOWED_PAYMENT_OPTIONS.ONE_MONTH:
      case ALLOWED_PAYMENT_OPTIONS.THREE_MONTHS:
      case ALLOWED_PAYMENT_OPTIONS.SIX_MONTHS:
      case ALLOWED_PAYMENT_OPTIONS.TWELVE_MONTHS:
        const vipInviteLink = await getNewInviteLink(
          ctx,
          channelId,
          subscriptionType
        );
        createUserInstance.storeUserLink(
          vipInviteLink.invite_link,
          vipInviteLink.name
        );
        break;
      case ALLOWED_PAYMENT_OPTIONS.MENTORSHIP_PRICE_LIST:
        const mentorshipInvite = await getNewInviteLink(
          ctx,
          MENTORSHIP_CHANNEL_ID,
          subscriptionType
        );
        createUserInstance.storeUserLink(
          mentorshipInvite.invite_link,
          mentorshipInvite.name
        );
        break;
    }

    // Handle package-specific actions
    const params = [
      ctx,
      userId,
      subscriptionType,
      MENTORSHIP_CHANNEL_ID,
      channelId,
      googleDriveLink,
      isActive,
      isExpired,
    ];
    const handlePackage = packageHandler[package];
    if (handlePackage) {
      await handlePackage(...params);
    } else {
      console.error(
        `No handler found for subscription type: ${subscriptionType}`
      );
    }
  } catch (error) {
    console.error("Error in approveCallback:", error);
    await ctx.answerCallbackQuery({
      callback_query_id: ctx.update.callback_query.id,
      text: "An error occurred. Please try again later.",
      show_alert: true,
    });
  }
};
