const { createUserInstance } = require("../../../model/userInfo_singleton");
const screenshotStorage = require("../../navigation/screenshotStorageClass");
const {
  approveCallback,
} = require("../menuButtonsCallback/approval/approveCallback");
const { default: mongoose } = require("mongoose");
const { SubscriptionStatus } = require("./constants");
const { handleError } = require("./errorHandler");
const catchMechanismClass = require("../../../config/catchMechanismClass");
const catchMechanismClassInstance = catchMechanismClass.getInstance(
  mongoose.connection
);
exports.handleSubscriptionAction = async (
  ctx,
  uniqueId,
  subscriptionAction
) => {
  try {
    const userStorage = await screenshotStorage.getUserStorage(uniqueId);
    if (!userStorage) {
      await catchMechanismClassInstance.initialize();
    }
    const userSubscription = createUserInstance.getUserSubscription();
    const subscriptionStatus = userSubscription?.status;

    if (subscriptionStatus) {
      await screenshotStorage.updateSubscriptionStatus(
        uniqueId,
        subscriptionStatus
      );
    }
    if (subscriptionStatus !== SubscriptionStatus.PENDING) {
      createUserInstance.subscriptionStatus(SubscriptionStatus.PENDING);
    }
    await approveCallback(ctx, uniqueId);
  } catch (error) {
    console.error(
      `Error handling subscription action ${subscriptionAction}:`,
      error
    );
    handleError(ctx, error);
  }
};
