const { settingsClass } = require("./settingsClass");

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
      console.log(`Unknown property name: ${propertyName}`);
      return;
  }
};