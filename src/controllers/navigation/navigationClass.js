// const { clearAllMessages } = require("../../bots");
const { groupInfo } = require("../../menuInfo");
const { generateInlineKeyboard } = require("./generateInlineKeyboard");
const { getMenuOptions } = require("./getMenuOptions");
const screenshotStorage = require("./screenshotStorage_singleton");
let maintenanceInProgress = false;
class Navigation {
  constructor() {
    this.userMenuOptions = new Map();
    this.menuMessageId = null;
    this.uniqueUser = null; // Initialize userId to null
    this.nairaPrice = null
  }

  async navigate(ctx, option, callback = null) {
    const userId = ctx?.chat?.id; // Store the user ID
    let userMenuOptions = this.userMenuOptions.get(userId);
    

    if (!this.userMenuOptions.has(userId)) {
       // User not found in map, create a new entry
      this.userMenuOptions.set(userId, {
        stack: [],
        previousMenuMessageId: new Map(), // Initialize previousMenuMessageId as a Map
      });
      userMenuOptions = this.userMenuOptions.get(userId);
    }

    const stack = userMenuOptions.stack;
    const previousMenuMessageId = userMenuOptions.previousMenuMessageId;

    stack.push(option);
    await this.updateMenu(ctx, option.option ? option.option : option);
    const previousMenu = stack[stack.length - 2]; // Get the previous menu from the stack
    previousMenuMessageId.set(previousMenu, this.menuMessageId); // Set the message ID in the map

    if (callback && typeof callback === "function") {
      callback(ctx,option || null);
    }
    //const menu = await this.getUniqueUserData();
    // console.log(menu, "Users menu Options");
  }
  async goBack(ctx) {
    const userId = ctx?.chat?.id;
    const userMenuOptions = this.userMenuOptions.get(userId);
    // console.log(userMenuOptions.stack, "menu option")
    if (userMenuOptions) {
      const previousOption =
        userMenuOptions.stack[userMenuOptions.stack.length - 1];
      const Option = userMenuOptions.stack[userMenuOptions.stack.length - 2];
      const previousMenuMessageId =
        userMenuOptions.previousMenuMessageId.get(previousOption);
      
      if (previousMenuMessageId) {
        await ctx.api.deleteMessage(userId, previousMenuMessageId);
        userMenuOptions.previousMenuMessageId.delete(previousMenuMessageId);
      }

      if (userMenuOptions.stack.length > 1) {
        userMenuOptions.stack.pop(); // Remove the last element
        await this.updateMenu(ctx, { option: Option });
      } else if (userMenuOptions.stack.length === 1) {
        userMenuOptions.stack = []; // Empty the stack
        await this.updateMenu(ctx, "Main Menu");
      } else {
        ctx.reply("Cannot go back further.");
       await this.goToMainMenu(ctx)
      }
    }
  }
  async goToMainMenu(ctx) {
    try {
      const userId = ctx?.from?.id;
      const username = ctx.from?.username
      let userMenuOptions = this.userMenuOptions.get(userId);

      if (!userMenuOptions) {
        userMenuOptions = {
          stack: [],
          previousMenuMessageId: new Map(),
          inviteLinkId: null,
          faqIndex: 0 // Initialize faqIndex to 0
        };
        this.userMenuOptions.set(userId, userMenuOptions);
      } else {
        userMenuOptions.stack = [];
        userMenuOptions.previousMenuMessageId = new Map();
        userMenuOptions.inviteLinkId = null;
        userMenuOptions.faqIndex = 0; // Reset faqIndex to 0
      }
      // console.log(resetStack, "resetStack");

      if (userMenuOptions?.previousMenuMessageId?.size > 0) {
        const chatId = userId;
        const previousMenu =
          userMenuOptions.stack[userMenuOptions.stack.length - 1];
        const previousMenuMessageId =
          userMenuOptions.previousMenuMessageId.get(previousMenu);

        if (previousMenuMessageId) {
          try {
            await ctx.api.deleteMessage(chatId, previousMenuMessageId);
          } catch (error) {
            if (
              error.error_code === 400 &&
              error.description === "Bad Request: message to delete not found"
            ) {
              console.log(`Message not found, skipping deletion`);
            } else {
              throw error;
            }
          }
          userMenuOptions.previousMenuMessageId.delete(previousMenu);
        }
      }

      if (ctx.update?.callback_query && ctx.update?.callback_query?.message) {
        const messageId = ctx.update.callback_query?.message?.message_id;
        if (messageId) {
          const chatId = ctx.chat?.id;
          if (chatId) {
            try {
              await ctx.api.deleteMessage(chatId, messageId);
            } catch (error) {
              if (
                error.error_code === 400 &&
                error.description === "Bad Request: message to delete not found"
              ) {
                console.log(`Message already deleted, skipping deletion`);
                await this.updateMenu(ctx, "Main Menu"); // Update menu here
                return; // <--- Add return statement here
              } else {
                // throw error;
                console.log("Error deleting reply message:")
              }
            }
          }
        }
      }

      
      await screenshotStorage.resetScreenshotStorage(userId);
      await screenshotStorage.addUser(userId,username)
      await screenshotStorage.setServiceOption(userId, null)
      await screenshotStorage.setPaymentOption(userId, null)
      await screenshotStorage.setPaymentType(userId, null)
      await this.updateMenu(ctx, "Main Menu");
      this.userMenuOptions.set(userId, userMenuOptions);
    } catch (error) {
      console.log(error);
      ctx.reply("An error occurred while going to main menu.");
    }
  }
   getFAQIndex(userId) {
    const userMenuOptions = this.userMenuOptions.get(userId);
    return userMenuOptions ? userMenuOptions.faqIndex : null;
  }
   setFAQIndex(userId, index) {
    const userMenuOptions = this.userMenuOptions.get(userId);
    if (userMenuOptions) {
      userMenuOptions.faqIndex = index;
      this.userMenuOptions.set(userId, userMenuOptions);
    }
  }
  async updateMenu(ctx, options) {
    try {
      const userId = ctx?.chat?.id;
      const userMenuOptions = this.userMenuOptions.get(userId);
      const currentOption =
        userMenuOptions.stack[userMenuOptions.stack.length - 1];
       

      if (!userMenuOptions) {
        this.userMenuOptions.set(userId, {
          stack: [],
          previousMenuMessageId: new Map(),
        });
        this.menuMessageId = null; 
      }
      const chatInfo = await ctx.api.getChat(ctx.chat?.id);

      this.menuMessageId = chatInfo.last_message?.message_id ?? null;

      let option;
      if (typeof options === "object" && options.option) {
        option = options.option;
      } else {
        option = options;
      }
      if (currentOption !== option && !userMenuOptions.stack.includes(option)) {
        userMenuOptions.stack.push(option);
      }
      // If there's a next option, delete the previous message
      if (userMenuOptions.stack.length > 1) {
        const previousOption =
          userMenuOptions.stack[userMenuOptions.stack.length - 2];
        const previousMenuMessageId =
          userMenuOptions.previousMenuMessageId.get(previousOption);
        // console.log("message ID Initial",previousMenuMessageId)
        if (previousMenuMessageId) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, previousMenuMessageId);
            userMenuOptions.previousMenuMessageId.delete(previousOption);
          } catch (error) {
            if (
              error.error_code === 400 &&
              error.description === "Bad Request: message to delete not found"
            ) {
              console.log("Message already deleted, skipping deletion");
              // return; // Message has already been deleted, so we can exit early
            } else {
              console.log("Error deleting reply message:")
            }
          }
        }
      }
      // Update the menu
      const messageText =
        groupInfo[option] ?? `Welcome to the ${option} section!`;
      const keyboard = generateInlineKeyboard(getMenuOptions(option,userId));
      const replyMarkup = {
        inline_keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      };
      if (this.menuMessageId) {
        await ctx.api.editMessageText(   
          ctx.chat.id,
          this.menuMessageId, 
          messageText,
          {
            reply_markup: replyMarkup,
          }
        );
      } else {
        const message = await ctx.reply(messageText, {
          reply_markup: replyMarkup,
          parse_mode: "HTML",
        });
        this.menuMessageId = message.message_id;

        // Store the message ID for the current option
        userMenuOptions.previousMenuMessageId.set(option, message.message_id);
        // clearAllMessages.storeMessage(ctx.chat?.id, ctx?.from?.id, message.message_id, true);
        // console.log("message ID before",message.message_id)

        // Define an array of menu options
        let MenuOptions = [
          "USDT",
          "BTC",
          "Foreign Payment",
          "Naira Payment",
          "FAQ",
          "Check Subscription Status"
        ];

        // Check if the selected option is in the menu options array
        if (MenuOptions.includes(option)) {
          // If it is, delete the message after 5 seconds
          setTimeout(async () => {
            try {
              // Delete the message
              await ctx.api.deleteMessage(message?.chat.id, message.message_id);
            } catch (error) {
              // Log any errors that occur
              console.error("Error deleting reply message:");
            }
          }, 5000);
        }
      }
      // Update the userMenuOptions Map
      this.userMenuOptions.set(userId, userMenuOptions);
      if (option !== "Main Menu") {
        this.menuMessageId = null;
      }
    } catch (error) {
      console.log(error);
      ctx.reply("An error occurred while updating the menu.");
    }
  } 
  async deleteUserFromStack(userId) {
    this.userMenuOptions.delete(userId);
    console.log(`User with ID ${userId} has been deleted from the stack`);
  }
  async getUniqueUserData() {
    const uniqueUserData = [];
    for (const [userId, userMenuOptions] of this.userMenuOptions.entries()) {
      const userData = {
        userId,
        stack: userMenuOptions.stack,
        previousMenuMessageId: await userMenuOptions.previousMenuMessageId.get(
          "Vip Signal"
        ), // Access the previousMenuMessageId using the get method
      };
      const existingUser = uniqueUserData.find(
        (user) => user.userId === userId
      );
      if (!existingUser) {
        uniqueUserData.push(userData);
      }
    }
    return uniqueUserData;
  }
  updateCallbackInfo(ctx, option, messageId) {
    // Update the user's menu options in the map
    const userId = ctx.from.id;
    const userMenuOptions = this.userMenuOptions.get(userId);
    if (userMenuOptions) {
      userMenuOptions.previousMenuMessageId.set(option, messageId);
    } else {
      this.userMenuOptions.set(userId, {
        stack: [],
        previousMenuMessageId: new Map([[option, messageId]]),
        inviteLinkId:null
      });
    }
  }
  async performMaintenance(ctx) {
    if (maintenanceInProgress) {
      // Maintenance is already in progress, wait until it's done
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 3 seconds
      return;
    }
  
    maintenanceInProgress = true;
  
    const messageIds = [];
  
    // Send message to all users
    for (const [userId] of this.userMenuOptions) {
      console.log(`Sending message to user ${userId}`);
      const messageText = "Dear valued user, 🤖\n\nWe're performing scheduled maintenance in 10 sec. Please excuse any inconvenience. You'll be returned to the main menu shortly. Thank you for your patience! 🙏\n\nIf you encounter any errors, please restart the bot. We apologize for any inconvenience.";
      const messageId = await ctx.api.sendMessage(userId, messageText);
      console.log(`Message sent with ID ${messageId.message_id}`); // Access the message_id property
      messageIds.push({ userId, messageId: messageId.message_id }); // Store the message_id property
    }
  
    // Clear storage and delete message after 5 minutes
    setTimeout(async () => {
      try {
        console.log("Start clearing storage...");
        this.userMenuOptions.clear(); // Clear the entire map
        await screenshotStorage.clearAllScreenshots()
        console.log("Storage clear done!");
      } catch (error) {
        console.log(`Error clearing storage: ${error}`);
      } finally {
        for (const { userId, messageId } of messageIds) {
          try {
            await ctx.api.deleteMessage(userId, messageId);
          } catch (error) {
            // console.log(`Error deleting message ${messageId} for user ${userId}: ${error}`);
            await ctx.api.sendMessage(userId, "Error: Unable to delete message. Please try again later.");
          }
        }
         await this.getUniqueUserData();
        // console.log(menu, "Users menu Options");
        maintenanceInProgress = false; // Set to false when maintenance is complete
      }
    }, 3000); // 5 minutes
  }
  async getSingleUserMenu(userId) {
  const userMenuOptions = this.userMenuOptions.get(userId);
    if (!userMenuOptions) {
      throw new Error(`User menu options not found for userId: ${userId}`);
    }
  
    const userMenuData = {
      userId,
      stack: userMenuOptions.stack,
      previousMenuMessageId: Object.fromEntries(userMenuOptions.previousMenuMessageId),
      inviteLinkId:null
    };
  
    return userMenuData;
  }
  async addAllUsersToMenu(users) {
    if (!Array.isArray(users)) {
      throw new Error('Invalid users array');
    }
    try {
      for (const user of users) {
        const userId = user.userId;
        if (typeof user?.userId !== 'number' && typeof user?.userId !== 'string') {
          throw new Error(`User ID must be a number or string: ${user.userId}`);
        }
        
        if (!this.userMenuOptions.has(userId)) {
          this.userMenuOptions.set(userId, {
            stack: user.stack,
            previousMenuMessageId: new Map(Object.entries(user.previousMenuMessageId)),
            inviteLinkId: user.inviteLinkId,
          });
          
          // console.log("User added to userMenuOptions:");
          // console.log(this.userMenuOptions.get(userId));
        }
      }
      
    } catch (error) {
      console.error('Error adding users to menu:', error);
    }
    // return this.userMenuOptions
  }
}

module.exports = Navigation;