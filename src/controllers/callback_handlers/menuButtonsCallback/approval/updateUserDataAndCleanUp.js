// /src/controllers/callback_handlers/menuButtonsCallback/payment/approval/updateUserDataAndCleanUp.js

const mongoose = require("mongoose");
const screenshotStorage = require("../../../navigation/screenshotStorageClass");
const { createUserInstance } = require("../../../../model/userInfo_singleton");
const { handleUpdateError } = require("./handleUpdateError");
const { retryApiCall } = require("../../../../utilities");
const { UserInfo } = require("../../../../model/userManagementClass");
exports.updateUserDataAndCleanUp = async (ctx, userId, isActive) => {
  // Approval actions
  const userSubscription = createUserInstance.getUserSubscription();
  const userLink = createUserInstance.getUserLink();
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
            updateSubscriptionAndExpirationDate(userId, userSubscription?.type)
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
      console.error(`Error updating user ${userId} data:`, error);
      await handleUpdateError(error, updateData, ctx, callbackQueryId);
    } finally {
      await session.endSession();
    }
  }

  try {
    const deletionResult = await screenshotStorage.deleteAllScreenshotMessages(
      ctx,
      userId
    );
    if (deletionResult) {
      await screenshotStorage.removeUser(userId);
    }
  } catch (error) {
    await ctx.answerCallbackQuery({
      callback_query_id: callbackQueryId,
      text: "Error deleting message!",
      show_alert: true,
    });
    console.error(`Error deleting message for user ${userId}:`, error);
  }

  return updated;
};
