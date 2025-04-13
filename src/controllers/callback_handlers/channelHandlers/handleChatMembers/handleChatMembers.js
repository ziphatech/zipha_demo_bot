const catchMechanismClass = require("../../../../config/catchMechanismClass");
const User = require("../../../../model/user.model");
const { UserInfo } = require("../../../../model/userManagementClass");
const { retryApiCall } = require("../../../../utilities");
const { Navigation } = require("../../../navigation/navigationClass");
const screenshotStorage = require("../../../navigation/screenshotStorageClass");
const vipChannelId = process.env.VIP_SIGNAL_ID;
const catchMechanismClassInstance = catchMechanismClass.getInstance();

async function handleChatMember(ctx) {
  try {
    if (Number(ctx.update.chat_member.chat.id) !== Number(vipChannelId)) return;

    const chatMemberUpdate = ctx.update?.chat_member;
    if (!chatMemberUpdate) {
      console.log("ctx.update.chat_member is null or undefined");
      return;
    }

    const newChatMember = chatMemberUpdate.new_chat_member.user;
    const userId = newChatMember?.id;
    const firstName = newChatMember?.first_name;
    const lastName = newChatMember?.last_name;
    const fullName = `${firstName} ${lastName}`;
    const username = newChatMember?.username;
    const isBot = newChatMember?.is_bot;
    const chatId = chatMemberUpdate.chat?.id;
    const newMemberStatus = chatMemberUpdate.new_chat_member.status;
    const oldMemberStatus = chatMemberUpdate.old_chat_member.status;
    const inviteLink = chatMemberUpdate.invite_link?.invite_link;
    const navigation = Navigation.getInstance();

    if (!isBot) {
      const existingUser = await User.findOne({ userId });
      const userMenuOptions = navigation.userMenuOptions.get(userId);
      const inviteLinkId = userMenuOptions?.inviteLinkId;

      if (newMemberStatus === "member" && oldMemberStatus === "left") {
        if (!existingUser) {
          const isLifetime =
            ctx?.update?.chat_member?.invite_link?.name?.toLowerCase() ===
            "lifetime";

          if (isLifetime) {
            const firstName =
              ctx.update?.chat_member?.new_chat_member?.user?.first_name;
            const lastName =
              ctx.update?.chat_member?.new_chat_member?.user?.last_name;
            const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
            const username =
              ctx.update?.chat_member?.new_chat_member?.user?.username;

            await User.create({
              userId,
              fullName,
              username,
              inviteLink: {
                link: inviteLink,
                name: "lifetime",
              },
              subscription: {
                type: "lifetime",
                expirationDate: null,
                status: "active",
              },
              groupMembership: {
                groupId: chatId,
                joinedAt: new Date(),
              },
            });

            await ctx.api.sendMessage(
              userId,
              "🎉 Welcome! You’ve been granted lifetime access."
            );
            console.log(`✅ New lifetime user ${userId} created and added.`);
            return;
          }

          await ctx.api.sendMessage(
            userId,
            "❌ You don't have an active subscription."
          );
          console.log(inviteLink, "inviteLink");
          await ctx.api.unbanChatMember(chatId, userId);
          console.log(`User ${userId} removed from group.`);
          return;
        }

        // Check if user is added by admin
        // if (
        //   chatMemberUpdate.invite_link?.added_by?.id === USER_ID
        // ) {
        //   console.log(`User ${userId} added by admin, allowed to join.`);
        //   await ctx.api.sendMessage(
        //     userId,
        //     "Welcome to our channel! You were added by an admin."
        //   );
        //   console.log(`User ${userId} joined successfully.`);
        //   return;
        // }

        // Delete invite message after 5 seconds
        if (inviteLinkId) {
          setTimeout(async () => {
            await retryApiCall(() =>
              ctx.api.deleteMessage(userId, inviteLinkId)
            );
            await navigation.deleteUserFromStack(userId);
            await screenshotStorage.removeUser(userId);
            await catchMechanismClassInstance.removeCatchMechanism(userId);
          }, 5000); // 5000 milliseconds = 5 seconds
        }

        // Check user subscription status
        if (existingUser) {
          await handleExistingUser(
            ctx,
            existingUser,
            userId,
            chatId,
            username,
            fullName
          );
          const replyMsg = await ctx.api.sendMessage(
            userId,
            "Welcome to our channel! Your subscription is active."
          );
          setTimeout(async () => {
            await retryApiCall(() =>
              ctx.api.deleteMessage(replyMsg.chat.id, replyMsg.message_id)
            );
          }, 5000); // 5000 milliseconds = 5 seconds

          console.log(`User ${userId} joined successfully.`);
        } else {
          await handleNewUser(ctx, userId, chatId, inviteLink);
          const replyMsg = await ctx.api.sendMessage(
            userId,
            "Welcome to our channel! Your subscription is active."
          );
          setTimeout(async () => {
            await retryApiCall(() =>
              ctx.api.deleteMessage(replyMsg.chat.id, replyMsg.message_id)
            );
          }, 5000); // 5000 milliseconds = 5 seconds

          console.log(`User ${userId} joined successfully.`);
        }
      } else {
        // Handle other membership status updates
        const userHasLeftGroup =
          newMemberStatus === "left" && oldMemberStatus === "member";
        // const userWasKickedFromGroup =
        //   newMemberStatus === "kicked" && oldMemberStatus === "member";
        // const userWasPreviouslyKicked =
        //   oldMemberStatus === "kicked" && newMemberStatus === "left";

        if (userHasLeftGroup) {
          const isLifetimeUser =
            existingUser?.subscription?.type === "lifetime";

          if (!isLifetimeUser && existingUser?.inviteLink?.link) {
            try {
              await ctx.api.revokeChatInviteLink(
                chatId,
                existingUser.inviteLink.link
              );
              console.log(
                "Invite link has been revoked for " + existingUser?.username
              );

              await ctx.api.sendMessage(
                userId,
                "<i>Your subscription has expired because you left the channel. You will not have access until you renew your package.</i>",
                { parse_mode: "HTML" }
              );

              await UserInfo.updateUser(existingUser.userId, {
                "groupMembership.groupId": null,
                "groupMembership.joinedAt": null,
                "subscription.status": "left",
              });

              console.log(
                `User ${existingUser?.username} updated: removed from group.`
              );
              return;
            } catch (error) {
              if (error.description === "INVITE_HASH_EXPIRED") {
                console.log(
                  "Invite link has already been revoked or expired for " +
                    existingUser?.username
                );
              } else {
                console.error("Error revoking invite link:", error);
              }
            }
          } else if (isLifetimeUser) {
            console.log(
              `Lifetime user ${existingUser?.username} left the group, but access remains.`
            );

            // Optional: just update group info, but leave subscription as active
            await UserInfo.updateUser(existingUser.userId, {
              "groupMembership.groupId": null,
              "groupMembership.joinedAt": null,
            });
          } else {
            console.log(
              "No invite link found for user " + existingUser?.username
            );
          }
        }
      }
    } else {
      console.log("User is a bot");
      return;
    }
  } catch (error) {
    console.error("Error in handleChatMember:", error);
  }
}
// Function to handle existing users

async function handleExistingUser(
  ctx,
  existingUser,
  userId,
  chatId,
  username,
  fullName
) {
  const invalidStatuses = ["expired", "inactive", "left"];
  const validSubscriptionTypes = [
    "one_month",
    "three_months",
    "six_months",
    "twelve_months",
  ];

  // ✅ Handle lifetime user re-join
  if (existingUser.subscription.type === "lifetime") {
    const currentInviteLink = ctx.update?.chat_member?.invite_link;
    const currentLinkName = currentInviteLink?.name?.toLowerCase();

    // const isCorrectLinkUsed = inviteLink === originalLink;
    const isLifetimeInvite = currentLinkName === "lifetime";

    if (!isLifetimeInvite) {
      await ctx.api.sendMessage(
        userId,
        "⚠️ You used an unauthorized invite link. Access denied."
      );
      await retryApiCall(() => ctx.api.unbanChatMember(chatId, userId));

      console.warn(
        `🚫 User ${userId} tried to rejoin with a different or unauthorized link.`
      );
      return;
    }

    // ✅ Safe to proceed
    await UserInfo.updateUser(existingUser.userId, {
      userId,
      fullName,
      username,
      "groupMembership.groupId": chatId,
      "groupMembership.joinedAt": new Date(),
    });

    await ctx.api.sendMessage(
      userId,
      "🎉 Welcome back! Your lifetime access has been restored."
    );

    console.log(`✅ Lifetime user ${userId} rejoined with correct link.`);
    return;
  }

  // ❌ Block if status is expired, inactive, or left
  if (invalidStatuses.includes(existingUser.subscription.status)) {
    const replyMsg = await ctx.api.sendMessage(
      userId,
      "Your subscription has expired or is inactive. Please renew before joining."
    );

    setTimeout(async () => {
      await retryApiCall(() =>
        ctx.api.deleteMessage(replyMsg.chat.id, replyMsg.message_id)
      );
    }, 10000);

    await retryApiCall(() => ctx.api.unbanChatMember(chatId, userId));
    console.log(
      `User ${userId} with expired/inactive subscription prevented from joining.`
    );
    return;
  }

  // ⏳ Pending valid user
  if (existingUser.subscription.status === "pending") {
    if (!validSubscriptionTypes.includes(existingUser.subscription.type)) {
      await ctx.api.sendMessage(
        userId,
        `Invalid subscription type ${existingUser.subscription.type}. Please contact support.`
      );
      await retryApiCall(() => ctx.api.unbanChatMember(chatId, userId));
      console.log(
        `User ${userId} with invalid subscription type prevented from joining.`
      );
      return;
    }

    await retryApiCall(() =>
      UserInfo.updateUser(existingUser.userId, {
        "groupMembership.groupId": chatId,
        "groupMembership.joinedAt": new Date(),
        "subscription.status": "active",
      })
    );
    console.log(`User ${userId} updated successfully from pending to active.`);
  }
}

// Function to handle new users
async function handleNewUser(ctx, userId, chatId, inviteLink) {
  const userWithSameLink = await User.findOne({
    "inviteLink.link": inviteLink,
  });
  const invalidStatuses = ["expired", "inactive", "left"];
  const validSubscriptionTypes = [
    "one_month",
    "three_months",
    "six_months",
    "twelve_months",
  ];

  if (userWithSameLink) {
    if (invalidStatuses.includes(userWithSameLink.subscription.status)) {
      const replyMsg = await ctx.api.sendMessage(
        userId,
        "Your subscription has expired or is inactive. Please renew before joining."
      );
      setTimeout(async () => {
        await retryApiCall(() =>
          ctx.api.deleteMessage(replyMsg.chat.id, replyMsg.message_id)
        );
      }, 10000); // 10000 milliseconds = 10 seconds
      await retryApiCall(() => ctx.api.unbanChatMember(chatId, userId));
      console.log(
        `User ${userId} with expired/inactive subscription prevented from joining.`
      );
      return;
    } else if (userWithSameLink.subscription.status === "pending") {
      if (
        !validSubscriptionTypes.includes(userWithSameLink.subscription.type)
      ) {
        await ctx.api.sendMessage(
          userId,
          `Invalid subscription type ${userWithSameLink.subscription.type}. Please contact support or choose the allowed Vip service options and resend your screenshot. `
        );
        // setTimeout(async () => {
        //   await retryApiCall(() =>
        //     ctx.api.deleteMessage(replyMsg.chat.id, replyMsg.message_id)
        //   );
        // }, 10000); // 10000 milliseconds = 10 seconds
        await retryApiCall(() => ctx.api.unbanChatMember(chatId, userId));
        console.log(
          `User ${userId} with invalid subscription type prevented from joining.`
        );
        return;
      }
      await retryApiCall(() =>
        UserInfo.updateUser(userWithSameLink.userId, {
          userId,
          fullName,
          username,
          "groupMembership.joinedAt": new Date(),
          "groupMembership.groupId": chatId,
          "subscription.status": "active",
        })
      );
      console.log(`User ${userId} updated successfully`);
    }
  } else {
    return;
  }
}

module.exports = {
  handleChatMember,
};
