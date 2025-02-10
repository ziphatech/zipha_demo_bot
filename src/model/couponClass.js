const settingsModel = require("./settings.model");
// Top of your file
// async function getNanoid() {
//     return (await import('nanoid')).nanoid;
//   }
//   // Usage
//   const nanoid = await getNanoid();

class Coupon {
  static instance; 

  constructor() {
    this.adminUserId = process.env.USER_ID;
    this.selectedOptions = new Map();
    this.pollMessageId = null;
    this.couponMessageSet = false;
    this.STATES = {
      VIP_PLAN: "VIP_PLAN",
      MENTORSHIP_PLAN: "MENTORSHIP_PLAN",
      GENERATE_COUPON: "GENERATE_COUPON",
    };
    this.couponCodeText = new Map();
    this.currentPollAnswer = this.STATES.VIP_PLAN;
  }
  async setCurrentPollAnswer(stateName) {
    this.currentPollAnswer = this.STATES[stateName];
  }
  async getCouponCodeText(userId) {
    const id = String(userId)
    const couponText = this.couponCodeText.get(id);
    if (!couponText) {
      throw new Error(`No coupon text found for user ID ${userId}`);
    }
    return couponText;
  }
  
  async setCouponCodeText(userId, messageText) {
    const id = String(userId)
    if (this.couponCodeText.has(id)) {
      this.couponCodeText.delete(id);
    }
    this.couponCodeText.set(id, messageText);
  }
  async getCurrentPollAnswer() {
    return this.currentPollAnswer;
  }
  async setCouponMessageSet(boolean) {
    this.couponMessageSet = boolean;
  }
  async getCouponMessageSet() {
    return this.couponMessageSet;
  }
  static getInstance() {
    if (!Coupon.instance) {
      Coupon.instance = new Coupon();
    }
    return Coupon.instance;
  }
  async setPollMessageId(pollId) {
    try {
      if (!pollId) {
        throw new Error("Poll ID not defined");
      }
      this.pollMessageId = pollId;
      //   console.log(pollId,"pollId")
    } catch (error) {
      console.error("Error setting PollId:", error);
    }
  }
  async getPollMessageId() {
    try {
      if (!this.pollMessageId) {
        throw new Error("Poll ID not found");
      }
      return this.pollMessageId;
    } catch (error) {
      console.error("Error getting pollId:", error);
    }
  }
  async setSelectedOptions(userId,option) {
    const id = String(userId)
    if (this.selectedOptions.has(id)) {
      this.selectedOptions.delete(id);
    }
    this.selectedOptions.set(id,option);
  }
  
  async getSelectedOptions(userId) {
    const id = String(userId)
    const option = this.selectedOptions.get(id);
    if (!option) {
      throw new Error(`No selected option found for user ID ${userId}`)
    }
    return option;
  }

  async generateCoupon(ctx) {
    try {
      const options = ctx.update?.callback_query?.data;
      // const username = ctx.update?.callback_query?.from?.username
      const couponId = ctx.update?.callback_query?.from.id
      const couponCode = await this.generateCouponCode(); // Assuming generateCouponCode() exists
      const selectedOption = await this.getSelectedOptions(this.adminUserId)
      if (!selectedOption || selectedOption.length === 0) {
        console.error("No selected options found")
       return
      }
      if (options === "generate_code") {
        const messageId = ctx.update?.callback_query?.message.message_id;
        const userId = ctx.update?.callback_query?.from.id;
        // setTimeout(async () => {
          await ctx.api.deleteMessage(userId, messageId);
        // }, 2000);
 
        ctx.api.sendMessage(
          userId,
          `<b>Your Code is:</b> <code>${couponCode}</code>`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Coupon List",
                    callback_data: "codeList",
                  },
                ],
                [
                  {
                    text: "Go Back",
                    callback_data: "mainmenu",
                  },
                ],
              ],
            },
            parse_mode: "HTML",
          }
        );
      }
      await settingsModel.findOneAndUpdate(
        { userId: this.adminUserId },
        {
          $push: {
            "settings.codeGeneration": {
              couponId,
              username: "",
              options: selectedOption,
              redeemed: false,
              timestamps: new Date(),
              couponCode,
            },
          },
        },
        { new: true, upsert: true }
      );
      //   console.log("Coupon Generated successfully", result)
    
    } catch (error) {
      console.error("Error generating coupon:", error);
      throw error;
    }
  }
  async generateCouponCode() {
    const { nanoid } = await import("nanoid");
    try {
      return nanoid(6).toUpperCase(); // Generate 6-character unique code
    } catch (error) {
      console.error("Error generating coupon code:", error);
      throw error;
    }
  }
  async getCouponCode(couponCode) {
  try {
    const coupon = await settingsModel.aggregate([
      {
        $match: {
          "settings.codeGeneration.couponCode": couponCode,
          "settings.codeGeneration.redeemed": true,
        },
      },
      {
        $unwind: "$settings.codeGeneration",
      },
      {
        $match: {
          "settings.codeGeneration.couponCode": couponCode,
          "settings.codeGeneration.redeemed": true,
        },
      }, 
      {
        $replaceRoot: {
          newRoot: "$settings.codeGeneration",
        },
      },
    ]);
    if (coupon.length > 0) {
      return coupon[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error retrieving coupon:", error);
    throw error; 
  }
  }
  async updateCoupon(identifier, updates) {
    try {
      if (typeof updates !== "object") {
        throw new Error("Updates must be an object");
      }
      const query = typeof identifier == 'number'
        ? { "settings.codeGeneration.couponId": identifier }
        : { "settings.codeGeneration.couponCode": identifier };

      const filter =  typeof identifier == 'number'
        ? { "element.couponId": identifier }
        : { "element.couponCode": identifier };

      const update = {};
      Object.keys(updates).forEach((key) => {
        update[`settings.codeGeneration.$[element].${key}`] = updates[key];
      });

      await settingsModel.updateOne(
        query,
        { $set: update },
        { arrayFilters: [filter] } 
      );
    } catch (error) {
      console.error("Error updating coupon:", error);
      throw error;
    }
  }
  async getActiveCoupon(ctx) {
    try {
      const userId = ctx.update.callback_query.from.id
      const messageId = ctx.update.callback_query.message.message_id
      const doc = await settingsModel.findOne({ userId: this.adminUserId });
      if (!doc) {
        console.log("Document not found");
        return;
      }
      const codeGeneration = doc.settings.codeGeneration;
      const activeUsers = codeGeneration.filter((user) => user.redeemed === false);

      const usersList = activeUsers.map((user, index) => {
        const optionsList = user.options.map((option) => {
          return `• (${option.callback_data})`;
        }).join("\n");
      
        return `<blockquote>${index + 1}. Please tap to copy code\n\nActive: ${user.active === false ? "No":"Yes"}\n\nCoupon Code: <code>${user.couponCode}</code>\n\nPackages:\n${optionsList}</blockquote>`;
      });
      
      const message = `List:\n\n${usersList.join("\n\n<blockquote></blockquote>")}`;
      ctx.api.sendMessage(
        this.adminUserId ,
        `${message}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Go Back",
                  callback_data: "mainmenu",
                },
              ],
            ],
          },
          parse_mode: "HTML",
        }
      );
       setTimeout(async () => {
        await ctx.api.deleteMessage(userId, messageId);
        }, 2000);
    } catch (error) {
      console.error("Error fetching active coupons:", error);
      throw error;
    }
  }

  async deleteCoupon(couponCode) {
    try {
      const doc = await settingsModel.findOne({ userId: this.adminUserId });
      if (!doc) {
        console.log("Document not found");
        return;
      }
      const codeGeneration = doc.settings.codeGeneration;
      const index = codeGeneration.findIndex((obj) => obj.couponCode === couponCode);
      if (index === -1) {
        console.log("Coupon not found");
        return;
      }

      codeGeneration.splice(index, 1);
      await settingsModel.findOneAndUpdate(
        { userId: this.adminUserId },
        { $set: { "settings.codeGeneration": codeGeneration } },
        { new: true }
      );
      console.log("User coupon deleted successfully")
    } catch (error) {
      console.error("Error deleting coupon:", error);
      throw error;
    }
  }
}

module.exports = Coupon;
