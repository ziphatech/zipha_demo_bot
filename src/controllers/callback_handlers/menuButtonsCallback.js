const { default: mongoose } = require("mongoose");
const { groupInfo } = require("../../menuInfo");
const { createUserInstance } = require("../../model/userInfo_singleton");
const {
  convertToNGN,
  retryApiCall,
  updateSubscriptionAndExpirationDate,
} = require("../../utilities");
const Broadcast = require("../navigation/broadcast_singleton");
const { UserInfo } = require("../../model/userManagementClass");
const nav = require("../navigation/navigation_singleton");
const screenshotStorage = require("../navigation/screenshotStorage_singleton");
const { Settings } = require("../navigation/settingsClass");
const catchMechanismClass = require("../../config/catchMechanismClass");
const catchMechanismClassInstance = catchMechanismClass.getInstance(
  mongoose.connection
);
const Coupon = require("../../model/couponClass")
const couponInstance = Coupon.getInstance()
const ALLOWED_PAYMENT_OPTIONS = {
  MENTORSHIP_PRICE_LIST: "mentorship_price_list",
  BOOTCAMP_PAYMENT:"bootcamp_payment",
  ONE_MONTH: "one_month",
  THREE_MONTHS: "three_months",
  SIX_MONTHS: "six_months",
  TWELVE_MONTHS: "twelve_months",
};
const PAYMENT_OPTIONS = {
  FUND_MANAGEMENT: '$10,000 - $49,000',
  MENTORSHIP_PRICE_LIST: 'mentorship_price_list',
  ONE_ON_ONE_PRICE_LIST: 'one_on_one_price_list',
};
exports.handleUsdtPay = async (ctx) => {
  try {
    const replyText = ` <strong>Please make payment to any of the addresses below</strong>

<i>USDT Payment:</i>

<blockquote>

Address: <code> TTMurcF3176rJ9pRU7SneJ2Y2CAYHyxnSB </code>

Network: <b>( TRC20 )</b>

Address: <code> 0x1b0f6181caaea9c86822fb3795930c1a0c4d317a</code>

Network: <b>( ERC20 )</b>

Address: <code>0x1b0f6181caaea9c86822fb3795930c1a0c4d317a</code>

Network: <b>BSC(BEP20)</b>

</blockquote>
<i>Copy address and make payment and send screeshot of completed payment here then wait for confirmation.</i>
  `;
    const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
    const messageId = ctx.update.callback_query.message.message_id;

    await ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: buttons,
      },
      parse_mode: "HTML",
    });
    // Initialize the navigation object
    if (!ctx.session.navigation) {
      ctx.session.navigation = nav();
    }
    // Update callback info
    ctx.session.navigation.updateCallbackInfo(ctx, "USDT", messageId);
    // Clear session storage
    ctx.session = null;
  } catch (error) {
    console.error("Error in handleUsdtPay:", error);
  }
};
exports.handleNairaPay = async (ctx) => {
  try {
    // Get the current option from the ctx
    const option = ctx.update.callback_query.message.text;
    const userId = Number(process.env.USER_ID);
    // Extract the dollar price from the option text
    const dollarPrice = option.replace(/(?:.*?\$)(\d+).*$/, "$1");
    const navigation = nav();
    const NAIR_CURRENT_RATE = await Settings.getNairaPriceByUserId(userId);
    // console.log(NAIR_CURRENT_RATE,"NAIR_CURRENT_RATE")
    const defaultNgData = { conversion_rates: { NGN: NAIR_CURRENT_RATE } };
    const ngData = navigation?.nairaPrice || defaultNgData;
    // console.log(ngData,"ngData",navigation?.nairaPrice)
    // Check if ngData is defined
    if (ngData) {
      // Convert the dollar price to NGN using the convertToNGN function
      const result = await convertToNGN(dollarPrice, ngData);
      let amountInNGN = "Unknown";
      let flexibleExchangeRate = "Unknown";
      if (result) {
        amountInNGN = result.amountInNGN;
        flexibleExchangeRate = result.flexibleExchangeRate;
      }
      const formartedNairaPrice = String(amountInNGN).replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
      );
      // Add a check to ensure dollarPrice is a valid number
      if (isNaN(dollarPrice)) {
        console.error("Error: dollarPrice is not a valid number", option);
        return;
      }

      const replyText = `
<strong>Naira Payment (Exclusive for Nigerians)</strong>

<i>Please make payment to the details below</i>

<blockquote>

Bank : Gtbank

Bank Name : <code>Nneeh David Chile</code>

Acc Number : <code>0361709821</code>

Amount : ${formartedNairaPrice} NGN

</blockquote>
<blockquote>
Current Exchange Rate: $1 USD = ${flexibleExchangeRate} NGN (Rate is subject to change)
</blockquote>

<i>Copy Account details and make payment and send screenshot of completed payment here then wait for confirmation.</i>
`;
      const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
      const messageId = ctx.update.callback_query.message.message_id;
      await ctx.reply(replyText, {
        reply_markup: {
          inline_keyboard: buttons,
        },
        parse_mode: "HTML",
      });
      // Initialize the navigation object
      if (!ctx.session.navigation) {
        ctx.session.navigation = nav();
      }

      // Update callback info
      ctx.session.navigation.updateCallbackInfo(
        ctx,
        "Naira Payment",
        messageId
      );
      // Clear session storage
      ctx.session = null;
    } else {
      console.error("Error: ngData is undefined");
      const replyText = `<i>Unable to retrieve NGN exchange rate. Please try again later. Our team is working hard to resolve this issue.</i>`;
      const replyMsg = await ctx.reply(replyText, { parse_mode: "HTML" });
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(replyMsg?.chat?.id, replyMsg.message_id);
        } catch (error) {
          console.error("Error deleting reply message:", error);
        }
      }, 5000);
    }
  } catch (error) {
    console.error("Error in Naira Payment:", error);
  }
};
exports.handleBtcPay = async (ctx) => {
  try {
    // Handle Coinbase Pay option
    const replyText = `<b>Please make payment to the addresses below</b>\n\n
<i>BTC Payment</i>

<blockquote>
<strong>BTC Address</strong> : <code>1E5vFKzgBv9jWH2oXAyJ9Lbnrnh9EvuJgW</code>
</blockquote>
<i>Copy address and make payment and send screeshot of completed payment and wait for confirmation</i>
`;
    const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
    const messageId = ctx.update.callback_query?.message.message_id;
    await ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: buttons,
      },
      parse_mode: "HTML",
    });
    // Initialize the navigation object
    if (!ctx.session.navigation) {
      ctx.session.navigation = nav();
    }

    // Update callback info
    ctx.session.navigation.updateCallbackInfo(ctx, "BTC", messageId);
    // Clear session storage
    ctx.session = null;
  } catch (error) {
    console.error("Error in handleBtcPay:", error);
  }
};
exports.handleSkrillPay = async (ctx) => {
  try {
    // Handle Coinbase Pay option
    const replyText = `<b>Please make payment to the address below</b>\n\n
<i>Skrill Payment</i>

<blockquote>
<strong>Skrill Email</strong> : <code> vineedking@gmail.com</code>
</blockquote>
<i>Copy address and make payment and send screeshot of completed payment and wait for confirmation</i>
`;
    const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
    const messageId = ctx.update.callback_query?.message.message_id;
    await ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: buttons,
      },
      parse_mode: "HTML",
    });
    // Initialize the navigation object
    if (!ctx.session.navigation) {
      ctx.session.navigation = nav();
    }

    // Update callback info
    ctx.session.navigation.updateCallbackInfo(ctx, "Skrill Payment", messageId);
    // Clear session storage
    ctx.session = null;
  } catch (error) {
    console.error("Error in handleBtcPay:", error);
  }
};
exports.handleEthereumPay = async (ctx) => {
  try {
    // Handle Coinbase Pay option
    const replyText = `<b>Please make payment to the address below</b>\n\n
<i>Ethereum Payment</i>

<blockquote>

Address: <code> 0x1b0f6181caaea9c86822fb3795930c1a0c4d317a</code>

Network: <b>( ERC20 )</b>

</blockquote>
<i>Copy address and make payment and send screeshot of completed payment and wait for confirmation</i>
`;
    const buttons = [[{ text: "Main Menu", callback_data: "mainmenu" }]]; // your buttons array
    const messageId = ctx.update.callback_query?.message.message_id;
    await ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: buttons,
      },
      parse_mode: "HTML",
    });
    // Initialize the navigation object
    if (!ctx.session.navigation) {
      ctx.session.navigation = nav();
    }

    // Update callback info
    ctx.session.navigation.updateCallbackInfo(ctx, "ERC", messageId);
    // Clear session storage
    ctx.session = null;
  } catch (error) {
    console.error("Error in handleBtcPay:", error);
  }
};
exports.handleBankTransfer = async (ctx) => {
  try {
    const replyText = `

<blockquote>
<b>
Here is a payment method Easy to Send up for bank transfer. You can go to App Store or Playstore and download the app.
All information you need to complete payment are given below. Once done send a screenshot of prove and your payment will be approved with a link sent to you.
</b>
</blockquote>

<strong>USA🇺🇸 , UK 🇬🇧, CANADA 🇨🇦, BELGIUM 🇧🇪, AUSTRIA 🇦🇹, FRANCE 🇫🇷, GERMANY 🇩🇪, IRELAND 🇮🇪, ITALY 🇮🇹, SPAIN 🇪🇸, PORTUGAL 🇵🇹, UNITED ARAB EMIRATES 🇦🇪, NETHERLANDS 🇳🇱, MAYOTTE 🇾🇹, Payments : </strong>

<strong>Download TAP TAP SEND on AppStore or PlayStore </strong>

<blockquote>
Phone number :<code>+2349067727167</code>

Bank Acc : <b>Guarantee Trust Bank (GTBANK)</b>

Acc Name : <code>Nneeh David Chile</code>

Acc Number :<code>0361709821 </code>

Gmail : <code> Chrischile5316@gmail.com </code>
</blockquote>
<strong>Send screenshot / Hash receipts to validate payment.</strong>
`;
    const buttons = [
      [
        {
          text: "Google play",
          url: process.env.BANK_TRANSFER_URL,
        },
        { text: "App Store", url: process.env.BANK_TRANSFER_URL },
      ],
      [
        {
          text: "Go Back",
          callback_data: "mainmenu",
        },
        { text: "Main Menu", callback_data: "mainmenu" },
      ],
    ]; // your buttons array
    const messageId = ctx.update.callback_query.message.message_id;
    await ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: buttons,
      },
      parse_mode: "HTML",
    });
    // Initialize the navigation object
    if (!ctx.session.navigation) {
      ctx.session.navigation = nav();
    }
    // Update callback info
    ctx.session.navigation.updateCallbackInfo(ctx, "Binance Pay", messageId);
    // Clear session storage
    ctx.session = null;
  } catch (error) {
    console.error("Error in handleBinancePay:", error);
  }
};
exports.handleFAQText = async (ctx, direction) => {
  try {
    const navigation = nav();
    // const direction = ctx.update.callback_query.data;
    const faqArray = groupInfo["FAQs"];
    let currentIndex = direction.includes("_")
      ? direction.split("_")[1]
      : direction;

    // Initialize previousMenuMessageId if it doesn't exist
    if (!navigation.userMenuOptions.has(ctx.from.id)) {
      navigation.userMenuOptions.set(ctx.from.id, {
        stack: [],
        previousMenuMessageId: new Map(),
        faqIndex: 0,
      });
    }
    const userMenuOptions = navigation.userMenuOptions.get(ctx.from.id);
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "Prev", callback_data: "prev_faq" },
          { text: "Next", callback_data: "next_faq" },
        ],
        [
          {
            text: "Main Menu",
            callback_data: "mainmenu",
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    const deletePreviousMessage = async (previousMessageId) => {
      if (previousMessageId !== null) {
        try {
          await ctx.api.deleteMessage(ctx.chat?.id, previousMessageId);
        } catch (error) {
          if (
            error.error_code === 400 &&
            error.description === "Bad Request: message to delete not found"
          ) {
            console.log(
              `Message to delete not found. Skipping delete operation.`
            );
          } else {
            console.log("Error deleting reply message:");
          }
        }
      }
    };

    const editMessageText = async (faqText) => {
      try {
        await ctx.api.editMessageText(
          ctx.chat?.id,
          ctx.update.callback_query.message.message_id,
          faqText,
          {
            reply_markup: replyMarkup,
            parse_mode: "HTML",
          }
        );
      } catch (error) {
        if (
          error.error_code === 400 &&
          error.description === "Bad Request: message to edit not found"
        ) {
          console.log("Message to edit not found. Skipping edit.");
        } else {
          throw error;
        }
      }
    };

    switch (direction) {
      case "FAQ":
        const previousMessageId =
          userMenuOptions.previousMenuMessageId.get("FAQ");
        await deletePreviousMessage(previousMessageId);
        navigation.setFAQIndex(ctx.from.id, 0);
        const faqText = faqArray[0];
        await ctx.api.sendMessage(ctx.chat?.id, faqText, {
          reply_markup: replyMarkup,
          parse_mode: "HTML",
        });
        break;

      case `next_${currentIndex}`:
        const nextPreviousMessageId =
          userMenuOptions.previousMenuMessageId.get(direction);
        await deletePreviousMessage(nextPreviousMessageId);
        const nextIndex = (parseInt(currentIndex) + 1) % faqArray.length;
        navigation.setFAQIndex(ctx.from.id, nextIndex);

        const nextFaqText = faqArray[nextIndex];
        await editMessageText(nextFaqText);
        break;

      case `prev_${currentIndex}`:
        const prevPreviousMessageId =
          userMenuOptions.previousMenuMessageId.get(direction);
        await deletePreviousMessage(prevPreviousMessageId);

        const prevIndex =
          (parseInt(currentIndex) - 1 + faqArray.length) % faqArray.length;
        navigation.setFAQIndex(ctx.from.id, prevIndex);

        const prevFaqText = faqArray[prevIndex];
        await editMessageText(prevFaqText);

        break;

      default:
        console.log("Invalid direction");
    }
  } catch (error) {
    console.error("Error in handleFAQText:", error);
  }
};
exports.approveCallback = async (ctx, uniqueId) => {
  try {
    // Verification and prep
    const {
      VIP_SIGNAL_ID: channelId,
      MENTORSHIP_CHANNEL_ID,
      BOOTCAMP_CHANNEL_ID,
      GOOGLE_DRIVE_LINK: googleDriveLink,
      ADMIN_ID,
    } = process.env;
    const {
      callback_query: {
        message: {
          message_id: messageId,
          chat: { id: chatId },
        },
        id: callbackQueryId,
      },
    } = ctx.update;
    const navigation = nav();
    const userStorage = await screenshotStorage.getUserStorage(uniqueId);
    if (!userStorage) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: "User storage data not found.",
        show_alert: true,
      });
      console.error("User storage data not found for userId:", uniqueId);
      return;
    }
    const subscriptionType = createUserInstance.getSubscriptionType()
    const { isExpired, isActive} = userStorage;
    const screenshotData = userStorage.screenshots.get(uniqueId);
    if (!screenshotData) {
        await ctx.answerCallbackQuery({ 
          callback_query_id: callbackQueryId,
          text: "Error handling screenshot data.",
          show_alert: true,
        });
        return;
    }
    const { username, userId, package } = screenshotData;
    // console.log(username, isExpired, isActive, "isExpired, isActive", username);
    if (!messageId) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: "🤦‍♂️ Message ID not found! \n\nPossible reasons:\n\n1. Technical issues\n2. Network connectivity problems\n3. Slow connection\n\nExpect another screenshot from user for retry.\n\n<i>We're here to help! 👉",
        parse_mode: "HTML",
        show_alert: true,
      });
      return;
    }

    // Input validation
    if (!channelId || !MENTORSHIP_CHANNEL_ID || !googleDriveLink || !ADMIN_ID || !BOOTCAMP_CHANNEL_ID) {
      await ctx.reply(
        "🤦‍♂️ Configuration error! \n\n<i>Possible reasons:</i>\n\n1. Environment variables not set\n2. Technical issues\n3. Network problems\n\n<i>Contact support for assistance.</i>\n\n<i>We're here to help! 👉</i>",
        { parse_mode: "HTML" }
      );
      return;
    }

    if (!userId) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: `🤦‍♂️ User ID not set! \n\nPossible reasons:\n\n1. Configuration error\n2. Technical issues\n3. Network problems\n\nExpect another screenshot from user @${
          username ?? " "
        } for retry.\n\nWe're here to help! 👉`,
        parse_mode: "HTML",
        show_alert: true,
      });
      return;
    }

    if (!subscriptionType) {
      await ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: `🤦‍♂️ Invalid payment option ${subscriptionType}! \n\nPossible reasons:\n\n1. Technical issues\n2. Network connectivity problems\n3. Slow connection\n\nExpect another screenshot from user @${username} for retry.\n\nWe're here to help! 👉`,
        parse_mode: "HTML",
        show_alert: true,
      });
      return;
    }
    // Generate the new invite link
    async function getNewInviteLink(chatId,option) {
      if (!Object.values(ALLOWED_PAYMENT_OPTIONS).includes(option)) {
          // console.log(`Invalid option: ${option}`);
        return;
      }
      try {
        const chat = await ctx.api.getChat(chatId);
        if (!chat) {
          throw new Error(`Chat not found: ${chatId}`);
        }
        const botMember = await ctx.api.getChatMember(
          chatId,
          process.env.GREYBOT_ID
        );
        if (botMember.status !== "administrator") {
          throw new Error(`Invalid chat or bot permissions: ${chatId}`);
        }
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const expireDateTimestamp = Math.floor(expirationDate.getTime() / 1000);

        const options = {
          name: option ?? "",
          member_limit: 1,
          expire_date: expireDateTimestamp,
          creates_join_request: false,
        };
        const newInviteLink = await ctx.api.createChatInviteLink(
          chatId,
          options
        );

        return newInviteLink;
      } catch (error) {
        await ctx.answerCallbackQuery({
          callback_query_id: callbackQueryId,
          text: "🤦‍♂️ Failed to generate invite link! \n\nPossible reasons:\n\n1. Technical issues\n2. Network connectivity problems\n3. Slow connection\n\nExpect another screenshot from user for retry.\n\nWe're here to help! 👉",
          parse_mode: "HTML",
          show_alert: true,
        });
        return null;
      }
    }
    // Store user link
    switch (subscriptionType) {
      case ALLOWED_PAYMENT_OPTIONS.ONE_MONTH:
      case ALLOWED_PAYMENT_OPTIONS.THREE_MONTHS:
      case ALLOWED_PAYMENT_OPTIONS.SIX_MONTHS:
      case ALLOWED_PAYMENT_OPTIONS.TWELVE_MONTHS:
        const vipInviteLink = await getNewInviteLink(channelId,subscriptionType);
        createUserInstance.storeUserLink(
          vipInviteLink.invite_link,
          vipInviteLink.name
        );
        break;
      case ALLOWED_PAYMENT_OPTIONS.MENTORSHIP_PRICE_LIST:
        const mentorshipInvite = await getNewInviteLink(MENTORSHIP_CHANNEL_ID,subscriptionType);
        createUserInstance.storeUserLink(
          mentorshipInvite.invite_link,
          mentorshipInvite.name
        );
        break;
    }

    // Approval actions
    const userSubscription = createUserInstance.getUserSubscription();
    const userLink = createUserInstance.getUserLink();
    const newSubscriptionType = createUserInstance.getSubscriptionType();

    async function updateUserDataAndCleanUp() {
      const updateData = {
        subscription: userSubscription,
        inviteLink: userLink,
      };
    
      let updated = true;
    
      if (userSubscription.type.includes("month")) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            if (isActive) {
              await retryApiCall(() =>
                updateSubscriptionAndExpirationDate(userId, newSubscriptionType)
              );
            } else {
              if (
                userSubscription?.status === "pending" &&
                userLink?.link &&
                userLink?.name
              ) {
                await retryApiCall(() => UserInfo.updateUser(userId, updateData));
              } else {
                throw new Error(
                  "Invalid subscription status or incomplete invite link"
                );
              }
            }
          });
        } catch (error) {
          updated = false;
          // Log error and send notification
          console.error(`Error updating user ${userId} data:`, error);
          await handleUpdateError(error, updateData);
        } finally {
          await session.endSession();
        }
      }
    
      try {
        const deletionResult =
          await screenshotStorage.deleteAllScreenshotMessages(ctx, userId);
        // console.log(`Deleted screenshot messages for user ${userId}:`, deletionResult);
    
        if (deletionResult) { 
          await screenshotStorage.removeUser(userId);
        }
      } catch (error) {
        await ctx.answerCallbackQuery({
          callback_query_id: callbackQueryId,
          text: " Error deleting message!",
          show_alert: true,
        });
        console.error(`Error deleting message for user ${userId}:`, error);
      }
    
      return updated;
    }

    async function handleUpdateError(error, updateData) {
      const systemInfo = `
        Error Message: Failed to update user info
        Error Details: ${error.message}
        User Details:
        UserID: ${userId}
        ${JSON.stringify(updateData, null, 2)}
      `;

      const userErrorMessage =
        "We haven't received the updated information from you. Add a username to your Telegram if you haven't done so. To complete verification, clear your chat history, follow the previous procedure, and resend the screenshot. This ensures you can join the channel and your information can be properly tracked and updated.";

      const adminErrorMessage = `Error updating user info for ${userId}. Please investigate.`;

      // console.error("Error updating user subscription and invite link:", error);

      await ctx.api.sendPhoto(userId, process.env.CLEAR_CATCH_PHOTO_ID, {
        caption: userErrorMessage,
        parse_mode: "HTML",
      });
      if (error && Object.keys(error).length > 0) {
        await ctx.api.sendMessage(ADMIN_ID, error);
      }

      if (systemInfo && adminErrorMessage) {
        await ctx.api.sendMessage(
          ADMIN_ID,
          systemInfo + "\n" + adminErrorMessage
        );
      }
      //  createUserInstance.resetUserInfo();
    }

    // Send message and link only if update is successful
    async function sendMessage(userId, messageText, inlineKeyboard) {
      const inviteLinkId = await ctx.api.sendMessage(userId, messageText, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });

      navigation.userMenuOptions.set(userId, {
        ...navigation.userMenuOptions.get(userId),
        inviteLinkId: inviteLinkId.message_id,
      });
      await catchMechanismClassInstance.addInviteLinkToCatchMechanism(
        userId,
        inviteLinkId.message_id
      );
    }
   
    const packageHandler = {
    
      Generic: async (...params) => {
        try {
          const [ctx, userId, subscriptionType,,,,googleDriveLink,isActive, isExpired] = params;
          const updateSuccessful = await updateUserDataAndCleanUp();
          if (!updateSuccessful) {
            throw new Error("Update was not successful");
          }
          const invite_link = createUserInstance.getUserLink()
          let messageText;
          let keyboard;
          switch (subscriptionType) {
            case PAYMENT_OPTIONS.FUND_MANAGEMENT:
              messageText = "Your fund management payment has been approved.";
              keyboard = [
                [
                  {
                    text: "Access Fund Management",
                    url: googleDriveLink,
                  },
                ],
                [
                  {
                    text: "Go Back to Menu",
                    callback_data: "mainmenu",
                  },
                ],
              ];
              break;
            case PAYMENT_OPTIONS.ONE_ON_ONE_PRICE_LIST:
              messageText = "Welcome to 1 On 1 Mentorship with Greysuitfx"
              keyboard = [
                [
                  {
                    text: "DM Mr Grey",
                    url: googleDriveLink,
                  },
                ],
                [
                  {
                    text: "Go Back to Menu",
                    callback_data: "mainmenu",
                  },
                ],
              ];
              break;
            case PAYMENT_OPTIONS.MENTORSHIP_PRICE_LIST:
              messageText =
                "You're welcome to the Mentorship section. Please click the link below to join the channel.";
              keyboard = [
                [
                  {
                    text: "Join Mentorship",
                    url: invite_link?.link,
                  },
                  {
                    text: "Go Back to Menu",
                    callback_data: "mainmenu",
                  },
                ],
              ];
              break;
            default:
              const expiredKeyboard = [
                [
                  {
                    text: "Renew Subscription",
                    url: invite_link?.link,
                  },
                ],
                [
                  {
                    text: "Go Back to Menu",
                    callback_data: "mainmenu",
                  },
                ],
              ];
      
              const activeKeyboard = [
                [
                  {
                    text: "Check Subscription Status",
                    callback_data: "check_subscription_status",
                  },
                ],
              ];
      
              const vipChannelKeyboard = [
                [
                  {
                    text: "Join VIP Channel",
                    url: invite_link?.link,
                  },
                  {
                    text: "Go Back to Menu",
                    callback_data: "mainmenu",
                  },
                ],
              ];
      
              if (isActive) {
                messageText =
                  "Your subscription has been upgraded.\nYou can check your Subcription status for Comfirmation.";
                keyboard = activeKeyboard;
              } else if (isExpired) {
                messageText =
                  "Your subscription has been renewed.\nWelcome to Greysuitfx VIP Signal Channel.";
                keyboard = expiredKeyboard;
              } else {
                messageText =
                  "Congrats! Your payment has been approved.\nWelcome to Greysuitfx VIP Signal Channel.";
                keyboard = vipChannelKeyboard;
              }
              break;
          }
          await sendMessage(userId, messageText, keyboard);
      
          await ctx.answerCallbackQuery({
            callback_query_id: callbackQueryId,
            text: "Payment approved!",
            show_alert: true,
          });
          //  createUserInstance.resetUserInfo(); // Reset user info on success
          await catchMechanismClassInstance.removeUserManagementAndScreenshotStorage(
            userId
          );
        } catch (error) {
          console.error("Error occurred:", error);
          await ctx.answerCallbackQuery({
            callback_query_id: callbackQueryId,
            text: "An error occurred. Please try again later.",
            show_alert: true,
          });
        }
      },
    
      Gift: async (...params) => {
        try {
          const [ctx, userId, subscriptionType, MENTORSHIP_CHANNEL_ID, channelId,,googleDriveLink] = params;
          const updateSuccessful = await updateUserDataAndCleanUp();
          let vipInviteLink, mentorshipInvite,messageText,keyboard;
      
          let hasMonth = false;
          let hasOneOnOne = false;
          let hasMentorshipPrice = false;
      
          if (!updateSuccessful) {
            throw new Error("Update was not successful");
          }
      
          const couponCode = await couponInstance.getCouponCodeText(userId);
          const couponSelectedOptions = (await couponInstance.getCouponCode(couponCode)).options;
        
          couponSelectedOptions.forEach((option) => {
            if (option.callback_data.includes('month')) hasMonth = true;
            if (option.callback_data === 'one_on_one_price_list') hasOneOnOne = true;
            if (option.callback_data === 'mentorship_price_list') hasMentorshipPrice = true;
          });
      
          if (hasMonth && hasOneOnOne && hasMentorshipPrice) {
            mentorshipInvite = await getNewInviteLink(MENTORSHIP_CHANNEL_ID, 'mentorship_price_list');
            vipInviteLink = await getNewInviteLink(channelId, subscriptionType);
      
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "Mentorship Group",
                  url: mentorshipInvite?.invite_link,
                },
              ],
              [
                {
                  text: "One-on-One Mentorship",
                  url: googleDriveLink,
                }
              ],
              [
                {
                  text: "VIP Link",
                  url: vipInviteLink?.invite_link,
                }
              ],
              [
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          } else if (hasMonth && hasOneOnOne) {
            vipInviteLink = await getNewInviteLink(channelId, subscriptionType);
      
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "One-on-One Mentorship",
                  url: googleDriveLink,
                }
              ],
              [
                {
                  text: "VIP Link",
                  url: vipInviteLink?.invite_link,
                }
              ],
              [
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          } else if (hasMonth && hasMentorshipPrice) {
            mentorshipInvite = await getNewInviteLink(MENTORSHIP_CHANNEL_ID, 'mentorship_price_list');
            vipInviteLink = await getNewInviteLink(channelId, subscriptionType);
      
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "Mentorship Group",
                  url: mentorshipInvite?.invite_link,
                }
              ],
              [
                {
                  text: "VIP Link",
                  url: vipInviteLink?.invite_link,
                }
              ],
              [
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          } else if (hasOneOnOne && hasMentorshipPrice) {
            mentorshipInvite = await getNewInviteLink(MENTORSHIP_CHANNEL_ID, 'mentorship_price_list');
      
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "Mentorship Group",
                  url: mentorshipInvite?.invite_link,
                }
              ],
              [
                {
                  text: "One-on-One Mentorship",
                  url: googleDriveLink,
                }
              ],
              [
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          } else if (hasMonth) {
            vipInviteLink = await getNewInviteLink(channelId, subscriptionType);
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "VIP Link",
                  url: vipInviteLink?.invite_link,
                },
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          } else if (hasOneOnOne) {
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "One-on-One Mentorship",
                  url: googleDriveLink,
                },
              ],
              [
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          } else if (hasMentorshipPrice) {
            mentorshipInvite = await getNewInviteLink(MENTORSHIP_CHANNEL_ID, 'mentorship_price_list');
      
            messageText = "Congratulations! You've received a gift subscription.";
            keyboard = [
              [
                {
                  text: "Mentorship Group",
                  url: mentorshipInvite?.invite_link,
                },
              ],
              [
                {
                  text: "Go Back to Menu",
                  callback_data: "mainmenu",
                },
              ],
            ];
          }
      
          await sendMessage(userId, messageText, keyboard);
      
          await ctx.answerCallbackQuery({
            callback_query_id: callbackQueryId,
            text: "Payment approved!",
            show_alert: true,
          });
      
          await catchMechanismClassInstance.removeUserManagementAndScreenshotStorage(userId);
        } catch (error) {
          console.error("Error occurred:", error);
          await ctx.answerCallbackQuery({
            callback_query_id: callbackQueryId,
            text: "An error occurred. Please try again later.",
            show_alert: true,
          });
        }
      },
    
      BootCamp: async (...params) => {
        const BOOTCAMP_CHANNEL_ID = params[4]
        const bootcamp_link = await getNewInviteLink(BOOTCAMP_CHANNEL_ID,"bootcamp_payment");
        const messageText = "Welcome to BootCamp!";
        const keyboard = [
          [
            {
              text: "Start BootCamp",
              url: bootcamp_link?.invite_link,
            },
          ],
          [
            {
              text: "Go Back to Menu",
              callback_data: "mainmenu",
            },
          ],
        ];
        await sendMessage(userId, messageText, keyboard);
        await ctx.answerCallbackQuery({
          callback_query_id: callbackQueryId,
          text: "Payment approved!",
          show_alert: true,
        });
    
        await catchMechanismClassInstance.removeUserManagementAndScreenshotStorage(userId);
      },
    };
    
    // Usage
    const params = [ctx, userId, subscriptionType,MENTORSHIP_CHANNEL_ID,channelId,BOOTCAMP_CHANNEL_ID,googleDriveLink, isActive, isExpired];
    const handlePackage = packageHandler[package];
    if (handlePackage) {
      await handlePackage(...params);
    } else {
      console.error(`Unknown package type: ${packageType}`);
    }
  } catch (error) {
    let errorMessage = "";

    if (error.error_code === 400) {
      errorMessage = `Bad Request: ${error.description}`;
    } else if (error.error_code === 401) {
      errorMessage = "Unauthorized. Please check API credentials.";
    } else if (error.error_code === 403) {
      errorMessage = `Forbidden: ${error.description}`;
    } else if (error.error_code === 404) {
      errorMessage = `Not Found: ${error.description}`;
    } else if (error.error_code === 500) {
      errorMessage = "Internal Server Error. Please try again later.";
    } else {
      errorMessage = `An unexpected error occurred: ${error.message}`;
    }

    ctx.answerCallbackQuery({
      callback_query_id: ctx.update.callback_query.id,
      text: "Sorry, something went wrong! Please try again later or contact our support team for assistance.",
      show_alert: true,
    });

    await ctx.api.sendMessage(process.env.ADMIN_ID, error);
    // Log the error for further investigation
    console.error("Error in approveCallback:", errorMessage);
  }
};
exports.appealCallback = async (ctx, userId, action, messageIdCount) => {
  try {
    const messageId = ctx.update.callback_query.message.message_id;
    const broadcast = Broadcast(); // Assuming Broadcast is a class
    const userStorage = await screenshotStorage.getUserStorage(userId);
    if(!userStorage){
      await catchMechanismClassInstance.initialize();
    }
    const screenshotData = await screenshotStorage.getScreenshot(userId);
    const userID = screenshotData.userId;
    const username = screenshotData.username;
    const photoId = screenshotData.photoIds[messageIdCount];
    const messageID = screenshotData.messageIds[messageIdCount];
    if (!screenshotData) {
      return sendError(ctx, "Screenshot data not found.");
    }

    broadcast.active = true;
    broadcast.message = ctx.update.callback_query.message;
    broadcast.userId = {
      userID,
      photoId,
      messageID,
      action,
    };
    broadcast.messageId = messageId;

    if (!ctx.chat) {
      return sendError(ctx, "Chat context not available.");
    }

    const replyAppeal = await ctx.reply(
      `Appeal will be sent to this @${username}. Enter your message.`,
      { parse_mode: "HTML" }
    );

    if (!replyAppeal.chat || !replyAppeal.chat.id) {
      return sendError(
        ctx,
        "Sorry, something went wrong. Please try again later."
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await ctx.api.deleteMessage(replyAppeal.chat.id, replyAppeal.message_id);
  } catch (error) {
    console.error(`Error in appealCallback: ${error.message}`);
    sendError(ctx, `Error in appealCallback: ${error.message}`);
  }
};
exports.cancleCallback = async (ctx,userId,action) => {

  try{
   
    if(action == "cancel"){
      const couponCode = await couponInstance.getCouponCodeText(userId)
      const userStorage = await screenshotStorage.getUserStorage(userId);
    
      if(!userStorage){
        await catchMechanismClassInstance.initialize();
      }
      const screenshotData = await screenshotStorage.getScreenshot(userId);
      const username = screenshotData.username;
      const caption = `<i>Hello! ${username} your gift has been cancled. Please contact support for further Clearification</i>`   
      if (!screenshotData) {
        return sendError(ctx, "Screenshot data not found.");
      }
      const replyCancel = await ctx.reply(
        `<i>Message canceled successfull</i>`,
        { parse_mode: "HTML" }
      );
      await ctx.api.sendMessage(userId,caption, {
        reply_markup: { inline_keyboard: [
          [
            {text:"Contact Support",url:process.env.CONTACT_SUPPORT},
            {text:"Go Back",callback_data:"mainmenu"}
          ]
        ] },
        parse_mode: "HTML",
      })
      setTimeout(async () => {
        await screenshotStorage.deleteAllScreenshotMessages(ctx, userId);
      }, 1000);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await ctx.api.deleteMessage(replyCancel.chat.id, replyCancel.message_id);
      await couponInstance.deleteCoupon(couponCode)
    }else{
      const navigation = nav()
      const messageId = ctx.update.callback_query.message.message_id;
      const userId  = ctx.update.callback_query.from.id
      await ctx.api.deleteMessage(userId, messageId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await navigation.goBack(ctx);
    }
   

  }catch(error){
    console.error(`Error in cancelCallback: ${error.message}`);
    sendError(ctx, `Error in cancelCallback: ${error.message}`);
  }
 
}
async function sendError(ctx, text) {
  if (!ctx.update || !ctx.update.callback_query) {
    console.error("Missing callback query or update context");
    return;
  }

  const callbackQueryId = ctx.update.callback_query.id;

  try {
    await retryApiCall(() =>
      ctx.answerCallbackQuery({
        callback_query_id: callbackQueryId,
        text: "An unexpected error occurred. Please try again later.", // Ensure text length limit
        show_alert: true,
      })
    );
  } catch (error) {
    console.error("Error sending error message:", error);
    // Optional: Send error report to administrator
  }
} 