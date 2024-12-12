const catchMechanismClass = require("../../../config/catchMechanismClass");
const Coupon = require("../../../model/couponClass");
const settingsModel = require("../../../model/settings.model");
const { createUserInstance } = require("../../../model/userInfo_singleton");
const { retryApiCall, generateCaption } = require("../../../utilities");
const screenshotStorage = require("../../navigation/screenshotStorageClass");
const couponInstance = Coupon.getInstance();
const catchMechanismClassInstance = catchMechanismClass.getInstance();
async function validateCouponCode(couponCode) {
  const settingsDoc = await settingsModel.findOne({
    "settings.codeGeneration.couponCode": couponCode,
  });

  if (!settingsDoc) {
    return { valid: false, message: "Coupon code does not exist." };
  }

  const coupon = settingsDoc.settings.codeGeneration.find(
    (coupon) => coupon.couponCode === couponCode
  );
  const options = coupon.options;
  if (coupon.redeemed) {
    return {
      valid: false,
      message: "Coupon code has already been used by another user.",
    };
  }
 
  await couponInstance.updateCoupon(coupon.couponId, { redeemed: true });
  return {
    valid: true,
    options,
    message: "Your code has been confirmed. Please wait for approval.",
  };
}

exports.handleGiftCoupon = async (ctx) => {
    const messageText = ctx.update.message.text;
    const username = ctx.from?.username;
    const userId = ctx.from?.id;
    const messageId = ctx.update.message.message_id;
    const data = await validateCouponCode(messageText);
    await couponInstance.setCouponCodeText(userId,messageText)
    if (data.valid) {
    const serviceOption = data?.options?.length > 1
    ? data.options.map(opt => `\t${opt.text}`).join("\n")
    : data?.options?.[0].text;
      // Store user information before sending screenshot
      createUserInstance.setUserProperties(userId, username, ctx);
      createUserInstance.subscriptionStatus("inactive");
      // Save user data to database
      try {
        await createUserInstance.saveUserToDB();
      } catch (error) {
        console.log("Error saving user data. Please try again later:", error);
        return; 
      }
  
      const screenshotData = {
        photoId: "No photoId found",
        messageId,
        username,
      };
      await screenshotStorage.addScreenshot(userId, screenshotData,"Gift");
  
      const caption = generateCaption(ctx, serviceOption,null,null,type = "Free");
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
            text: "Cancel",
            callback_data: `cancel_${userId}_${messageIdCount - 1}`,
          },
        ],
      ];
  
      const responseChannel = await retryApiCall(() =>
        ctx.api.sendMessage(channelId,caption, {
          reply_markup: { inline_keyboard: inlineKeyboard },
          parse_mode: "HTML",
        })
      );
  
      const responsePayment = await retryApiCall(() =>
        ctx.reply(data.message, {
          reply_markup: {
            inline_keyboard: [[{ text: "Go Back", callback_data: "mainmenu" }]],
          },
        })
      );
      const channelMessageId = responseChannel.message_id;
      const paymentMessageId = responsePayment.message_id;
      await screenshotStorage.updateChannelAndPaymentMessageId(
        userId,
        channelMessageId, 
        paymentMessageId
      );
      await catchMechanismClassInstance.addCatchMechanism(userId);
      await couponInstance.setCouponMessageSet(false)
    } else {
      const replyMarkup = {
        inline_keyboard: [[{ text: "Main Menu", callback_data: "mainmenu" }]],
      };
  
      await ctx.reply(data.message, {
        reply_markup: replyMarkup,
      });
      await couponInstance.setCouponMessageSet(false)
    }
  };