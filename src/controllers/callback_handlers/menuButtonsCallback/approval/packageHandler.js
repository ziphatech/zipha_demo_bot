// /src/controllers/callback_handlers/menuButtonsCallback/payment/approval/packageHandler.js

const { sendMessage } = require("./sendMessage");
const { updateUserDataAndCleanUp } = require("./updateUserDataAndCleanUp");
const Coupon = require("../../../../model/couponClass");
const couponInstance = Coupon.getInstance();
const { createUserInstance } = require("../../../../model/userInfo_singleton");
const catchMechanismClass = require("../../../../config/catchMechanismClass");
const catchMechanismClassInstance = catchMechanismClass.getInstance();
const { getNewInviteLink } = require("./getNewInviteLink");

const PAYMENT_OPTIONS = {
  FUND_MANAGEMENT: "fund_management",
  ONE_ON_ONE_PRICE_LIST: "one_on_one_price_list",
  MENTORSHIP_PRICE_LIST: "mentorship_price_list",
};

exports.packageHandler = {
  Generic: async (...params) => {
    try {
      const [
        ctx,
        userId,
        subscriptionType,
        ,
        ,
        ,
        googleDriveLink,
        isActive,
        isExpired,
      ] = params;
      const updateSuccessful = await updateUserDataAndCleanUp(
        ctx,
        userId,
        isActive,
        ctx.update.callback_query.id
      );
      if (!updateSuccessful) {
        throw new Error("Update was not successful");
      }
      const invite_link = createUserInstance.getUserLink();
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
          messageText = "Welcome to 1 On 1 Mentorship with Greysuitfx";
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
              "Your subscription has been upgraded.\nYou can check your Subscription status for Confirmation.";
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
      await sendMessage(ctx, userId, messageText, keyboard);

      await ctx.answerCallbackQuery({
        callback_query_id: ctx.update.callback_query.id,
        text: "Payment approved!",
        show_alert: true,
      });
      // createUser Instance.resetUser Info(); // Reset user info on success
      await catchMechanismClassInstance.removeUserManagementAndScreenshotStorage(
        userId
      );
    } catch (error) {
      console.error("Error occurred:", error);
      await ctx.answerCallbackQuery({
        callback_query_id: ctx.update.callback_query.id,
        text: "An error occurred. Please try again later.",
        show_alert: true,
      });
    }
  },

  Gift: async (...params) => {
    try {
      const [
        ctx,
        userId,
        subscriptionType,
        MENTORSHIP_CHANNEL_ID,
        channelId,
        googleDriveLink,
        isActive,
      ] = params;
      const updateSuccessful = await updateUserDataAndCleanUp(
        ctx,
        userId,
        isActive,
        ctx.update.callback_query.id
      );
      let vipInviteLink, mentorshipInvite, messageText, keyboard;

      let hasMonth = false;
      let hasOneOnOne = false;
      let hasMentorshipPrice = false;

      if (!updateSuccessful) {
        throw new Error("Update was not successful");
      }

      const couponCode = await couponInstance.getCouponCodeText(userId);
      const couponSelectedOptions = (
        await couponInstance.getCouponCode(couponCode)
      ).options;

      couponSelectedOptions.forEach((option) => {
        if (option.callback_data.includes("month")) hasMonth = true;
        if (option.callback_data === "one_on_one_price_list")
          hasOneOnOne = true;
        if (option.callback_data === "mentorship_price_list")
          hasMentorshipPrice = true;
      });

      if (hasMonth && hasOneOnOne && hasMentorshipPrice) {
        mentorshipInvite = await getNewInviteLink(
          ctx,
          MENTORSHIP_CHANNEL_ID,
          "mentorship_price_list"
        );
        vipInviteLink = await getNewInviteLink(
          ctx,
          channelId,
          subscriptionType
        );
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
            },
          ],
          [
            {
              text: "VIP Link",
              url: vipInviteLink?.invite_link,
            },
          ],
          [
            {
              text: "Go Back to Menu",
              callback_data: "mainmenu",
            },
          ],
        ];
      } else if (hasMonth && hasOneOnOne) {
        vipInviteLink = await getNewInviteLink(
          ctx,
          channelId,
          subscriptionType
        );

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
              text: "VIP Link",
              url: vipInviteLink?.invite_link,
            },
          ],
          [
            {
              text: "Go Back to Menu",
              callback_data: "mainmenu",
            },
          ],
        ];
      } else if (hasMonth && hasMentorshipPrice) {
        mentorshipInvite = await getNewInviteLink(
          ctx,
          MENTORSHIP_CHANNEL_ID,
          "mentorship_price_list"
        );
        vipInviteLink = await getNewInviteLink(
          ctx,
          channelId,
          subscriptionType
        );

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
              text: "VIP Link",
              url: vipInviteLink?.invite_link,
            },
          ],
          [
            {
              text: "Go Back to Menu",
              callback_data: "mainmenu",
            },
          ],
        ];
      } else if (hasOneOnOne && hasMentorshipPrice) {
        mentorshipInvite = await getNewInviteLink(
          ctx,
          MENTORSHIP_CHANNEL_ID,
          "mentorship_price_list"
        );

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
            },
          ],
          [
            {
              text: "Go Back to Menu",
              callback_data: "mainmenu",
            },
          ],
        ];
      } else if (hasMonth) {
        vipInviteLink = await getNewInviteLink(
          ctx,
          channelId,
          subscriptionType
        );
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
        mentorshipInvite = await getNewInviteLink(
          ctx,
          MENTORSHIP_CHANNEL_ID,
          "mentorship_price_list"
        );

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
      await sendMessage(ctx, userId, messageText, keyboard);

      await ctx.answerCallbackQuery({
        callback_query_id: ctx.update.callback_query.id,
        text: "Payment approved!",
        show_alert: true,
      });

      await catchMechanismClassInstance.removeUserManagementAndScreenshotStorage(
        userId
      );
    } catch (error) {
      console.error("Error occurred:", error);
      await ctx.answerCallbackQuery({
        callback_query_id: ctx.update.callback_query.id,
        text: "An error occurred. Please try again later.",
        show_alert: true,
      });
    }
  },

  BootCamp: async (ctx, userId, subscriptionType, BOOTCAMP_CHANNEL_ID,...rest) => {
    try {
      const updateSuccessful = await updateUserDataAndCleanUp(
        ctx,
        userId,
        rest[2],
        ctx.update.callback_query.id
      );
      if (!updateSuccessful) {
        throw new Error("Update was not successful");
      }
      const bootcamp_link = await getNewInviteLink(
        ctx,
        BOOTCAMP_CHANNEL_ID,
        subscriptionType
      );
     
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
      await sendMessage(ctx, userId, messageText, keyboard);
      await ctx.answerCallbackQuery({
        callback_query_id: ctx.update.callback_query.id,
        text: "Payment approved!",
        show_alert: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await catchMechanismClassInstance.removeUserManagementAndScreenshotStorage(
        userId
      );
    } catch (error) {
      console.error("Error occurred in BootCamp:", error);
      await ctx.answerCallbackQuery({
        callback_query_id: ctx.update.callback_query.id,
        text: "An error occurred. Please try again later.",
        show_alert: true,
      });
    }
  },
};
