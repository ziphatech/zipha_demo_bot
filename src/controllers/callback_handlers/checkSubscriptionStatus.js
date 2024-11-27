const { default: mongoose } = require("mongoose");
const { Greybot } = require("../../bots");
const User = require("../../model/user.model");
const { UserInfo } = require("../../model/userManagementClass");
const { retryApiCall } = require("../../utilities");
const GREYBOT_ID = process.env.GREYBOT_ID;

async function checkSubscription(channelId) {
  try {
    console.log(`Checking subscription status for channel ${channelId}...`);
    const users = await retryApiCall(() =>
      User.aggregate([
        {
          $match: {
            "groupMembership.groupId": { $type: "double" },
            "groupMembership.groupId": Number(channelId),
          },
        },
      ])
    );
    console.log(users, " users");
    for (const user of users) {
      const expirationDate = user.subscription.expirationDate;
      const joinedAt = user.groupMembership.joinedAt.getTime();
      const now = Date.now();

      // Existing logic remains the same
      if (expirationDate === null || expirationDate === undefined) {
        await handleExpiredSubscription(user);
      } else if (joinedAt === null && user.subscription.status === "inactive") {
        console.log(
          `User ${
            user.username || user.fullName
          } has not joined and subscription is inactive`
        );
      } else if (joinedAt !== null && expirationDate <= now) {
        await handleExpiredSubscription(user);
        // Check if user has blocked the bot
        const isBlocked = await retryApiCall(() =>
          Greybot.api.getChatMember(user.userId, GREYBOT_ID)
        );
        if (isBlocked.status === "member") {
          // Send message to user
          await retryApiCall(() => sendMessageToUser(user));
        } else {
          console.log(`User ${user.username} has blocked the bot`);
          return;
        }
      } else {
        const timeLeft = expirationDate - now;
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        console.log(`User ${user.username} subscription is active`);
        console.log(`Time left: ${days}d ${hours}h ${minutes}m ${seconds}s`);
        // Send expiration warning message one day before
        if (days <= 1) {
          const warningMessage = `
Your subscription will expire soon. Please check your subscription status and renew to maintain access.

You can check your subscription status via the bot for more info.

If you have any issues, contact our support team.
`;
          await retryApiCall(() =>
            Greybot.api.sendMessage(user.userId, warningMessage)
          );
          console.log(`Sent expiration warning to user ${user.username}`);
        }
      }
    }
    console.log(`Subscription status check complete for channel ${channelId}`);
  } catch (error) {
    console.error(
      `Error checking subscription status for channel ${channelId}:`,
      error
    );
  }
}
async function updateUserExpirationByJoinDate(userId) {
  try {
    console.log(`Updating expiration date for user ${userId}...`);

    const user = await retryApiCall(() => User.find({ userId }));

    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }

    const DAY = 24 * 60 * 60 * 1000;
    const EXPIRATION_DATES = {
      one_month: 30 * DAY,
      three_months: 3 * 30 * DAY,
      six_months: 6 * 30 * DAY,
      twelve_months: 12 * 30 * DAY,
    };

    const joinedAt = user[0].groupMembership.joinedAt.getTime();
    // console.log(user,joinedAt,"user.groupMembership?.joinedAt",user.groupMembership?.joinedAt)
    const subscriptionType = user[0].subscription.type;
    const expirationPeriod = EXPIRATION_DATES[subscriptionType];
    const expirationDate = joinedAt + expirationPeriod;

    await UserInfo.updateUser(userId, {
      "subscription.expirationDate": expirationDate,
    });

    console.log(
      `Updated expiration date for user ${user.username} to ${new Date(
        expirationDate
      ).toISOString()}`
    );
  } catch (error) {
    console.error(`Error updating expiration date for user ${userId}:`, error);
  }
}
/**
 * Updates users' expiration dates based on their join date and subscription type.
 */
async function updateUsersExpirationByJoinDate() {
  try {
    console.log("Updating users' expiration dates...");

    // Retrieve users who joined on or after October 1st '2024-10-01T00:00:00.000Z'
    // September 1, 2024: 2024-09-01T00:00:00.000Z
    // August 1, 2024: 2024-08-01T00:00:00.000Z
    // July 1, 2024: 2024-07-01T00:00:00.000Z
    const users = await retryApiCall(() =>
      User.find({
        "groupMembership.joinedAt": {
          $gte: new Date("2024-07-01T00:00:00.000Z"),
        },
        "subscription.status": "active",
      })
    );

    const DAY = 24 * 60 * 60 * 1000; // milliseconds in a day
    const EXPIRATION_DATES = {
      one_month: 30 * DAY,
      three_months: 3 * 30 * DAY,
      six_months: 6 * 30 * DAY,
      twelve_months: 12 * 30 * DAY,
    };

    for (const user of users) {
      const joinedAt = user.groupMembership?.joinedAt
        ? user.groupMembership.joinedAt.getTime()
        : null;
      const subscriptionType = user.subscription.type;
      const userId = user.userId;

      if (joinedAt && subscriptionType) {
        // Calculate expiration date based on joined date and subscription type
        const expirationPeriod = EXPIRATION_DATES[subscriptionType];
        if (expirationPeriod) {
          const expirationDate = joinedAt + expirationPeriod;

          // Update user's expiration date
          await UserInfo.updateUser(userId, {
            "subscription.expirationDate": expirationDate,
          });
          console.log(
            `Updated expiration date for user ${user.username} to ${new Date(
              expirationDate
            ).toISOString()}`
          );
        } else {
          console.log(`Invalid subscription type for user ${user.username}`);
        }
      } else {
        console.log(
          `No joined date or subscription type found for user ${user.username}`
        );
      }
    }

    console.log("Users' expiration dates updated");
  } catch (error) {
    console.error("Error updating users' expiration dates:", error);
  }
}
async function handleExpiredSubscription(user) {
  try {
    // Update subscription status to expired
    await retryApiCall(() =>
      UserInfo.updateUser(user.userId, {
        "subscription.status": "expired",
        "subscription.expirationDate": null,
      })
    );
    console.log(`Updated subscription status for user ${user.username}`);

    // Check if user has group membership
    if (!user.groupMembership || !user.groupMembership.groupId) {
      console.log(`No group ID found for user ${user.username}`);
      return;
    }

    // Remove user from channel and revoke invite link
    try {
      // Get chat member
      const chatMember = await retryApiCall(() =>
        Greybot.api.getChatMember(user.groupMembership.groupId, user.userId)
      );

      // Remove user from channel
      if (chatMember.status !== "left") {
        await retryApiCall(() =>
          Greybot.api.unbanChatMember(user.groupMembership.groupId, user.userId)
        );
        console.log(`Removed user ${user.username} from channel`);
      }

      // Revoke chat invite link
      if (user.inviteLink && user.inviteLink.link) {
        await retryApiCall(() =>
          revokeLink(user.groupMembership.groupId, user.inviteLink.link)
        )
          .then(() => {
            console.log(`Revoked chat invite link for user ${user.username}`);
          })
          .catch(async (error) => {
            console.error(
              `Error revoking chat invite link for user ${user.username}:`,
              error
            );

            // Attempt to kick user if link revocation fails
            // try {
            //   await retryApiCall(() =>
            //     kickUser(user.groupMembership.groupId, user.userId)
            //   );
            //   console.log(`Kicked user ${user.username} from channel due to link revocation failure`);
            //   return
            // } catch (kickError) {
            //   console.error(`Error kicking user ${user.username} from channel:`, kickError);
            // }
          });
      } else {
        console.log(`No invite link found for user ${user.username}`);
        return;
      }
    } catch (error) {
      console.error(
        `Error removing user ${user.username} from channel or revoking invite link:`,
        error
      );
      return;
    }
  } catch (error) {
    console.error(
      `Error updating subscription status for user ${user.username}:`,
      error
    );
    return;
  }
}

// Revoke link function
function revokeLink(groupId, link) {
  return new Promise((resolve, reject) => {
    Greybot.api
      .revokeChatInviteLink(groupId, link)
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

// Kick user function
function kickUser(groupId, userId) {
  return Greybot.api.kickChatMember(groupId, userId);
}

async function checkExpiredUsersRemoved() {
  try {
    // Retrieve user counts
    const totalUsers = await retryApiCall(() => User.countDocuments());
    const activeSubscriptions = await retryApiCall(() =>
      User.countDocuments({ "subscription.status": "active" })
    );
    const expiredSubscriptions = await retryApiCall(() =>
      User.countDocuments({ "subscription.status": "expired" })
    );

    // Retrieve users with expired subscriptions
    const usersWithExpiredSubscriptions = await retryApiCall(() =>
      User.find({ "subscription.status": "expired" })
    );

    const chatId = Number(process.env.VIP_SIGNAL_ID);
    const totalUsersInChannel = await retryApiCall(() =>
      Greybot.api.getChatMembersCount(chatId)
    );

    // Filter users not removed from channel
    const usersNotRemoved = await Promise.all(
      usersWithExpiredSubscriptions.map(async (user) => {
        if (!user.userId) {
          console.log(`User ID missing for ${user.username}`);
          return false;
        }
        try {
          const chatMember = await retryApiCall(() =>
            Greybot.api.getChatMember(chatId, user.userId)
          );
          return chatMember.status !== "left" ? user : false;
        } catch (error) {
          console.error(`Error checking user ${user.userId}:`, error);
          return false;
        }
      })
    );

    const usersNotRemovedArray = usersNotRemoved.filter(Boolean);

    let usersRemovedCount = 0;

    if (usersNotRemovedArray.length === 0) {
      console.log("All users with expired subscriptions removed from channel.");
    } else {
      console.log(
        "Not all users with expired subscriptions removed from channel."
      );
      console.log("Users not removed:", usersNotRemovedArray);

      await Promise.all(
        usersNotRemovedArray.map(async (user) => {
          try {
            // Remove user from channel
            await retryApiCall(() =>
              Greybot.api.kickChatMember(chatId, user.userId)
            );
            console.log(`Removed user ${user.userId} from chat.`);

            // Revoke chat invite link
            if (user.inviteLink && user.inviteLink.link) {
              await retryApiCall(() =>
                Greybot.api.revokeChatInviteLink(chatId, user.inviteLink.link)
              );
              console.log(`Revoked chat invite link for ${user.username}`);
            } else {
              console.log(`No invite link found for ${user.username}`);
            }

            // Update user document
            await retryApiCall(() =>
              User.updateOne({ _id: user._id }, { $unset: { inviteLink: "" } })
            );
            console.log(`Removed invite link from ${user.username} document`);

            usersRemovedCount++;
          } catch (error) {
            console.error(`Error removing user ${user.userId}:`, error);
            await retryApiCall(() =>
              Greybot.api.sendMessage(
                process.env.ADMIN_ID,
                error.message || "Users could not be removed"
              )
            );
          }
        })
      );
    }

    // Log statistics
    console.log(`Total users in database: ${totalUsers}`);
    console.log(`Active subscriptions: ${activeSubscriptions}`);
    console.log(`Expired subscriptions: ${expiredSubscriptions}`);
    console.log(`Total users in channel: ${totalUsersInChannel}`);
    console.log(`Users removed from channel: ${usersRemovedCount}`);

    // Send subscription report
    await retryApiCall(() =>
      Greybot.api.sendMessage(
        process.env.ADMIN_ID,
        `Subscription Report:
        Total users in database: ${totalUsers}
        Active subscriptions: ${activeSubscriptions}
        Expired subscriptions: ${expiredSubscriptions}
        Total users in channel: ${totalUsersInChannel}
        Users removed from channel: ${usersRemovedCount}`
      )
    );
  } catch (error) {
    console.error("Error checking expired users:", error);
  }
}

async function getSubscriptionStatus(ctx) {
  try {
    const userId = ctx?.from.id;
    const user = await retryApiCall(() => User.findOne({ userId }));

    if (!user) {
      ctx.reply("User not found");
    } else {
      const subscriptionType = user.subscription.type;
      const subStatus = subscriptionType.includes("_")
        ? subscriptionType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1);
      const username = user.username || user.fullname;
      const expirationDate = user.subscription.expirationDate;
      const now = Date.now();
      const subscriptionStatus = user.subscription.status;

      if (subscriptionStatus === "inactive") {
        ctx.reply(
          `Hello ${username}, your subscription is currently inactive.`
        );
      } else if (subscriptionStatus === "left") {
        ctx.reply(
          `Hello ${username}, your subscription  has expired because you left the channel you will not have access to it until you renew your package.`
        );
      } else if (!expirationDate) {
        ctx.reply(`Hello ${username}, you don't have an active subscription.`);
      } else if (expirationDate <= now) {
        ctx.reply(
          `Hello ${username}, your ${subscriptionType} subscription has expired.`
        );
      } else {
        const timeLeft = expirationDate - now;
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        const expirationDateFormat = new Date(expirationDate).toLocaleString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
          }
        );
        const replyMarkup = {
          inline_keyboard: [
            [{ text: "Go Back to Main Menu", callback_data: "mainmenu" }],
          ],
        };
        ctx.reply(
          `
*Hello ${username},*
*Your ${subStatus} subscription is active.*
*Time left:* ${days} _days_, ${hours} _hours_, ${minutes} _minutes_, ${seconds} _seconds_.

*Expiration Date:* ${expirationDateFormat}
`,
          {
            reply_markup: JSON.stringify(replyMarkup),
            parse_mode: "Markdown",
          }
        );
      }
    }
  } catch (error) {
    console.error("Error getting subscription status:", error);
    ctx.reply("Error getting subscription status");
  }
}

async function sendMessageToUser(user) {
  try {
    await retryApiCall(() =>
      Greybot.api.sendMessage(
        user.userId,
        "<b>Your subscription has expired.</b> <i>Please renew your subscription to continue to enjoy our services.</i>",
        {
          parse_mode: "HTML",
        }
      )
    );
  } catch (error) {
    if (error.description === "Forbidden: bot was blocked by the user") {
      console.log(`User ${user.username} has blocked the bot`);
    } else {
      console.error(`Error sending message to user ${user.username}:`, error);
    }
  }
}
module.exports = {
  checkSubscription,
  checkExpiredUsersRemoved,
  getSubscriptionStatus,
  updateUsersExpirationByJoinDate,
  updateUserExpirationByJoinDate,
};
