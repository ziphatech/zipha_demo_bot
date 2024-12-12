const { handleError } = require('./errorHandler');
const { handleSubscriptionAction } = require('./subscriptionHandler');
const { settingsClass } = require('../settings/settingsClass');
const { navigationMap } = require('../../navigation/navigationList');
const { handleOptionAction } = require('./optionActionHandler');
const { handleNavigationAction } = require('./navigationHandler');
const { cancleCallback } = require('../menuButtonsCallback/cancel/cancelCallback');
const { appealCallback } = require('../menuButtonsCallback/apeal/appealCallback');
const Coupon = require('../../../model/couponClass');
const couponInstance = Coupon.getInstance();
exports.menuOptionsCallback = async (ctx) => {
    const option = ctx.update?.callback_query?.data;
    const messageId = ctx.update.callback_query.message.message_id;
    const userId = ctx.update.callback_query.from.id;
    const settings = settingsClass();
    // Get the corresponding navigation action for the option
    const navigationFunc = navigationMap(
      ctx,
      messageId,
      userId,
      settings.settings
    );
    const navigationAction = navigationFunc[option];
    // Handle options that require splitting (e.g., "approve_uniqueId_messageIdCount")
    const [action, uniqueId, messageIdCount] = option.split("_");
  
    if (navigationAction) {
      await handleNavigationAction(ctx, navigationAction, option);
    }
  
    try {
      switch (action) {
        case "approve":
          await handleSubscriptionAction(ctx, uniqueId, action);
          break;
        case "appeal":
          await appealCallback(ctx, uniqueId, action, messageIdCount);
          break; 
        case "cancel":
        case "cancleCoupon":
          await cancleCallback(ctx, uniqueId,action)
          break
        case "codeList":
          await couponInstance.getActiveCoupon(ctx)
      }
      handleOptionAction(ctx, option);
    } catch (error) {
      console.error("Error handling request:", error);
      handleError(ctx, error);
    }
  };