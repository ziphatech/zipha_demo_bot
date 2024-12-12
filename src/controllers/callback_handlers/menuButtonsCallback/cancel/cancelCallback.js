// /src/controllers/callback_handlers/menuButtonsCallback/payment/approval/approveCallback.js

const catchMechanismClass = require("../../../../config/catchMechanismClass");
const catchMechanismClassInstance = catchMechanismClass.getInstance();
const screenshotStorage = require("../../../navigation/screenshotStorageClass");
const Coupon = require("../../../../model/couponClass");
const { sendError } = require("../sendErrorMessage");
const { Navigation } = require("../../../navigation/navigationClass");
const couponInstance = Coupon.getInstance();

exports.cancleCallback = async (ctx, userId, action) => {
  try {
    if (action == "cancel") {
      const couponCode = await couponInstance.getCouponCodeText(userId);
      const userStorage = await screenshotStorage.getUserStorage(userId);

      if (!userStorage) {
        await catchMechanismClassInstance.initialize();
      }
      const screenshotData = await screenshotStorage.getScreenshot(userId);
      const username = screenshotData.username;
      const caption = `<i>Hello! ${username} your gift has been cancled. Please contact support for further Clearification</i>`;
      if (!screenshotData) {
        return sendError(ctx, "Screenshot data not found.");
      }
      const replyCancel = await ctx.reply(
        `<i>Message canceled successfull</i>`,
        { parse_mode: "HTML" }
      );
      await ctx.api.sendMessage(userId, caption, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Contact Support", url: process.env.CONTACT_SUPPORT },
              { text: "Go Back", callback_data: "mainmenu" },
            ],
          ],
        },
        parse_mode: "HTML",
      });
      setTimeout(async () => {
        await screenshotStorage.deleteAllScreenshotMessages(ctx, userId);
      }, 1000);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await ctx.api.deleteMessage(replyCancel.chat.id, replyCancel.message_id);
      await couponInstance.deleteCoupon(couponCode);
    } else {
      const navigation = Navigation.getInstance();
      const messageId = ctx.update.callback_query.message.message_id;
      const userId = ctx.update.callback_query.from.id;
      await ctx.api.deleteMessage(userId, messageId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await navigation.goBack(ctx);
    }
  } catch (error) {
    console.error(`Error in cancelCallback: ${error.message}`);
    sendError(ctx, `Error in cancelCallback: ${error.message}`);
  }
};
