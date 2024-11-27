const { settingsClass } = require("../navigation/settingsClass");

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
      return
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
    const status = `Prices reset!`
    await ctx.answerCallbackQuery({
      text: status,
      show_alert: true, // Show the message as an alert to the user
    });
  } else if (discounts[callbackFn]) {
    const discount = discounts[callbackFn];
    const discountedPrices = {
        oneMonth: oneMonth - (oneMonth * discount),
        threeMonth: threeMonth - (threeMonth * discount),
        sixMonth: sixMonth - (sixMonth * discount),
        oneYear: oneYear - (oneYear * discount),
      };
    await settings.updateSettings(settings.callbackQuery, discountedPrices);
    // console.log(callbackFn, `${discount * 100}% off`);
    const status = `Discount applied: ${discount * 100}% now activated!`
    await ctx.answerCallbackQuery({
      text: status,
      show_alert: true, // Show the message as an alert to the user
    });
  }
};