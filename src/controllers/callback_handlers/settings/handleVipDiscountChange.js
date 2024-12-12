const { settingsClass } = require("./settingsClass");

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
    await settings.updateSettings(settings.callbackQuery, {
      oneMonth,
      threeMonth,
      sixMonth,
      oneYear,
    });
    const status = `Prices reset!`;
    await ctx.answerCallbackQuery({
      text: status,
      show_alert: true,
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
    const status = `Discount applied: ${discount * 100}% now activated!`;
    await ctx.answerCallbackQuery({
      text: status,
      show_alert: true,
    });
  }
};