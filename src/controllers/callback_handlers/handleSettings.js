const { Greybot } = require("../../bots");
const catchMechanismClass = require("../../config/catchMechanismClass");
const Coupon = require("../../model/couponClass");
const settingsModel = require("../../model/settings.model");
const { createUserInstance } = require("../../model/userInfo_singleton");
const { generateCaption, retryApiCall } = require("../../utilities");
const screenshotStorage = require("../navigation/screenshotStorage_singleton");
const { settingsClass } = require("../navigation/settingsClass");

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
exports.handleSettingsChange = async (ctx) => {
  const settings = settingsClass();
  const propertyName = ctx.update.callback_query.data;

  switch (propertyName) {
    case "nairaPrice":
    case "oneMonth":
    case "threeMonth":
    case "sixMonth":
    case "oneYear":
      await ctx.api.sendMessage(
        ctx.chat.id,
        `Enter your new ${propertyName}: `
      );
      settings.callbackQuery = propertyName;
      settings.settingMessage = true;
      break;
    case "vipDiscountPrice":
      settings.callbackQuery = propertyName;
      break;
    default:
      //   console.log(`Unknown property name: ${propertyName}`);
      return;
  }
};

exports.handleVipDiscountChange = async (ctx) => {
  const settings = settingsClass();
  const result = await settings.getSettings();
  const { oneMonth, threeMonth, sixMonth, oneYear } = result.vipPrice;
  const callbackFn = ctx.update.callback_query.data;

  const discounts = {
    "vip_10_%_off": 0.1,
    "vip_20_%_off": 0.2,
    "vip_30_%_off": 0.3,
    "vip_50_%_off": 0.5,
  };

  if (callbackFn === "vip_reset_all") {
    // Leave prices unchanged
    await settings.updateSettings(settings.callbackQuery, {
      oneMonth,
      threeMonth,
      sixMonth,
      oneYear,
    });
    // console.log("Prices reset");
    const status = `Prices reset!`;
    await ctx.answerCallbackQuery({
      text: status,
      show_alert: true, // Show the message as an alert to the user
    });
  } else if (discounts[callbackFn]) {
    const discount = discounts[callbackFn];
    const discountedPrices = {
      oneMonth: oneMonth - oneMonth * discount,
      threeMonth: threeMonth - threeMonth * discount,
      sixMonth: sixMonth - sixMonth * discount,
      oneYear: oneYear - oneYear * discount,
    };
    await settings.updateSettings(settings.callbackQuery, discountedPrices);
    // console.log(callbackFn, `${discount * 100}% off`);
    const status = `Discount applied: ${discount * 100}% now activated!`;
    await ctx.answerCallbackQuery({
      text: status,
      show_alert: true, // Show the message as an alert to the user
    });
  }
};

exports.generateCouponHandler = async (ctx) => {
  const options = ctx.update?.callback_query?.data;
  if (options === "generate_coupon") {
    const question = "Please select multiple options for combo gifting:";
    const options = [
      "VIP 1 month",
      "VIP 3 months",
      "VIP 6 months",
      "VIP 12 months",
      "Mentorship 1 on 1",
      "Mentorship Group",
    ];

    const answer = await ctx.replyWithPoll(question, options, {
      is_anonymous: false,
      allows_multiple_answers: true,
    });
    await couponInstance.setPollMessageId(answer.message_id);
  }
};

// exports.generateCouponHandler = async (ctx) => {
//   const options = ctx.update?.callback_query?.data;
//   if (options === "generate_coupon") {
//     const question = "Please select a VIP plan:";
//     const vipOptions = [
//       ["VIP 1 month", "vip_1_month"],
//       ["VIP 3 months", "vip_3_months"],
//       ["VIP 6 months", "vip_6_months"],
//       ["VIP 12 months", "vip_12_months"],
//     ];

//     const vipPoll = await ctx.replyWithPoll(question, vipOptions.map((option) => option[0]), {
//       is_anonymous: false,
//       allows_multiple_answers: false,
//     });

   
//     await couponInstance.setPollMessageId(vipPoll.message_id);

//   }
// };


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