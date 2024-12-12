const settingsModel = require("../../../model/settings.model");

class Settings {
  constructor() {
    this.userId = process.env.USER_ID;
    this.settings = {};
    this.settingMessage = null;
    this.message = null; 
    this.option = null;
    this.callbackQuery = null;
  }

  async getNewSettings(ctx) {
    if (this.settingMessage === true) {
      const messageText = ctx.update.message.text;
      // console.log(ctx,"callback_query")
      switch (this.callbackQuery) {
        case "oneMonth":
        case "threeMonth":
        case "sixMonth":
        case "oneYear":
        case "nairaPrice":
          if (isNaN(messageText)) {
            const errorReply = await ctx.reply("Error: Please enter a valid number!");
            setTimeout(async () => {
              await ctx.api.deleteMessage(errorReply.chat?.id, errorReply.message_id);
            }, 2000);
            return;
          } else {
            this.message = parseFloat(messageText);
          }
          break;
        default:
          console.log(`Unknown callback data: ${this.callbackQuery}`);
          await ctx.reply("Error: Invalid option selected. Please try again.");
          return;
          
      }
  
      await this.updateSettings(this.callbackQuery, this.message);
      const msgReply = await ctx.reply(`Your new setting has been saved as ${this.message}!`);
      setTimeout(async () => {
        await ctx.api.deleteMessage(msgReply.chat?.id, msgReply.message_id);
      }, 2000);
      this.message = null;
      this.settingMessage = null;
    }
  }

  async updateSettings(callbackQuery, newData) {
    // console.log(callbackQuery, newData);
    let settingsDoc = await settingsModel.findOne({ userId: this.userId });

    let updateDoc;
    switch (callbackQuery) {
      case "nairaPrice":
        updateDoc = { $set: { [`settings.${callbackQuery}`]: Number(newData) } };
        break;
      case "oneMonth":
      case "threeMonth":
      case "sixMonth":
      case "oneYear":
        updateDoc = { 
          $set: {
            [`settings.vipPrice.${callbackQuery}`]: Number(newData),
          }
        };
        const result = await this.getSettings();
        this.settings.vipDiscountPrice = result.vipPrice;
        // console.log("vipPrice1",this.settings.vipDiscountPrice)
        this.settings.vipDiscountPrice[callbackQuery] =  Number(newData)
        // console.log("vipPrice2",this.settings.vipDiscountPrice)
        await this.updateSettings('vipDiscountPrice', this.settings.vipDiscountPrice);
        break;
      case "vipDiscountPrice":
        updateDoc = { $set: { [`settings.${callbackQuery}`]: newData } };
        break;
      // Add more cases as needed
      default:
        // console.log("Invalid property name");
        return
    }
    if (updateDoc) {
      settingsDoc = await settingsModel.findOneAndUpdate(
        { userId: this.userId },
        updateDoc,
        { new: true, upsert: true }
      );
      await settingsDoc.save();
      this.settings = settingsDoc.settings;
    } else {
      console.log("No updates to apply");
    }
  }

  async getSettings() {
    let settingsDoc = await settingsModel.findOne({ userId: this.userId });
    if (!settingsDoc) {
      // Create a new document if one doesn't exist
      settingsDoc = await settingsModel.create({
        userId: this.userId,
        settings: {
          language: "",
          notificationPreferences: false,
          nairaPrice: 1600,
          vipPrice: {
            oneMonth: 52,
            threeMonth: 112,
            sixMonth: 212,
            oneYear: 402,
          },
          vipDiscountPrice: {
            oneMonth: 52,
            threeMonth: 112,
            sixMonth: 212,
            oneYear: 402,
          },
        },
      });
      await settingsDoc.save();
    } 
    this.settings = settingsDoc.settings;
    // console.log(settingsDoc.settings,"answer")
    return this.settings;
  }
  static async getNairaPriceByUserId(userId) {
    const settingsDoc = await settingsModel.findOne({ userId });
    return settingsDoc.settings.nairaPrice;
  }
}
let instance;

const settingsClass = () => {
  if (!instance) {
    instance = new Settings();
  }
  return instance;
};

module.exports = {
  settingsClass,
  Settings,
};