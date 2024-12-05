const { default: mongoose } = require("mongoose");
const catchMechanismClass = require("../../config/catchMechanismClass");
const { createUserInstance } = require("../../model/userInfo_singleton");
const { retryApiCall } = require("../../utilities");
const { navigationMap } = require("../navigation/navigationList");
const nav = require("../navigation/navigation_singleton");
const screenshotStorage = require("../navigation/screenshotStorage_singleton");
const { settingsClass } = require("../navigation/settingsClass");
const {
  handleVipDiscountChange,
  handleSettingsChange,
} = require("./handleSettings");
const { approveCallback, appealCallback,cancleCallback } = require("./menuButtonsCallback");
const Coupon = require("../../model/couponClass");
const couponInstance = Coupon.getInstance();
const navigation = nav();
const paymentTypes = [
  "usdt",
  "naira",
  "btc",
  "skrill",
  "erc",
  "foreign_payment",
];
const paymentOptions = [
  "$10,000 - $49,000",
  "$50,000 - $1 million",
  "mentorship_price_list",
  "one_on_one_price_list",
  "one_month",
  "three_months",
  "six_months",
  "twelve_months",
  "bootcamp_payment"
];
const serviceOptions = [
  "vip_signal",
  "mentorship",
  "partnership",
  "bootcamp",
  "fund_management",
];
const SubscriptionStatus = {
  EXPIRED: "expired",
  INACTIVE: "inactive",
  ACTIVE: "active",
  PENDING: "pending",
};
const DAY = 24 * 60 * 60 * 1000; // milliseconds in a day

const EXPIRATION_DATES = {
  one_month: 30 * DAY,
  three_months: 3 * 30 * DAY,
  six_months: 6 * 30 * DAY,
  twelve_months: 12 * 30 * DAY,
};
const catchMechanismClassInstance = catchMechanismClass.getInstance(
  mongoose.connection
);
// Function to handle menu options callback
exports.menuOptionsCallback = async (ctx) => {
  const option = ctx.update?.callback_query?.data;
  const messageId = ctx.update.callback_query.message.message_id;
  const userId = ctx.update.callback_query.from.id;
  const settings = settingsClass();
  // Get the corresponding navigation action for the option
  const navigationFunc = navigationMap(
    ctx,
    messageId,
    userId,
    settings.settings
  );
  const navigationAction = navigationFunc[option];
  // Handle options that require splitting (e.g., "approve_uniqueId_messageIdCount")
  const [action, uniqueId, messageIdCount] = option.split("_");

  if (navigationAction) {
    await handleNavigationAction(ctx, navigationAction, option);
  }

  try {
    switch (action) {
      case "approve":
        await handleSubscriptionAction(ctx, uniqueId, action);
        break;
      case "appeal":
        await appealCallback(ctx, uniqueId, action, messageIdCount);
        break;
      case "cancel":
      case "cancleCoupon":
        await cancleCallback(ctx, uniqueId,action)
        break
      case "codeList":
        await couponInstance.getActiveCoupon(ctx)
    }
    handleOptionAction(ctx, option);
  } catch (error) {
    console.error("Error handling request:", error);
    handleError(ctx, error);
  }
};

async function handleNavigationAction(ctx, navigationAction, option) {
  try {
    if (typeof navigationAction.navigation === "string") {
      await navigation.navigate(
        ctx,
        navigationAction.navigation,
        navigationAction.callback
      );
      await handleSelectionConfirmation(ctx, option, navigationAction);
    } else if (typeof navigationAction.navigation === "function") {
      if (navigationAction.callback === null) {
        await navigationAction.navigation(ctx, navigationAction.callback);
      } else {
        await navigation.navigate(
          ctx,
          navigationAction.navigation(),
          navigationAction.callback
        );
      }
    }
    // Rest of your code remains the same
    switch (option) {
      case "one_month":
      case "three_months":
      case "six_months":
      case "twelve_months": 
        // Calculate expiration date separately
        function calculateExpirationDate(option) {
          const currentTimestamp = Date.now();
          const subscriptionPeriod = EXPIRATION_DATES[option];
          return currentTimestamp + subscriptionPeriod;
        }
        // Pre-calculate expiration dates when user selects subscription option
        const expirationDate = calculateExpirationDate(option);
        createUserInstance.subscribe(option);
        createUserInstance.setExpirationDate(expirationDate);
        break;
      case "gift_coupon":
        await ctx.reply("Please Enter Coupon Code containig six characters");
        await couponInstance.setCouponMessageSet(true);
        break
      case "one_on_one_price_list":
      case "mentorship_price_list":
      case "$10,000 - $49,000":
      case "$50,000 - $1 million":
      case "bootcamp_payment":
        createUserInstance.subscribe(option);
        break
      
    }
  } catch (error) {
    console.error("Error handling navigation action:", error);
  }
}

async function handleSelectionConfirmation(ctx, option, navigationAction) {
  // Extract selected option and type into variables for clarity
  const userId = ctx.update.callback_query.from.id;
  const selectedOptions = {
    paymentType: paymentTypes.includes(option)
      ? navigationAction.navigation
      : "No payment type selected",
    paymentOption: paymentOptions.includes(option)
      ? navigationAction.navigation
      : "No subscription package selected",
    serviceOption: serviceOptions.includes(option)
      ? navigationAction.navigation
      : "No service option selected",
  };

  // Simplify sendSelectionConfirmation calls
  async function sendSelectionConfirmation(type, selectedOption) {
    await ctx.answerCallbackQuery({
      callback_query_id: ctx.update.callback_query.id,
      text: `${type} selected: ${selectedOption}`,
      show_alert: false,
    });
  }

  // Usage
  if (paymentTypes.includes(option)) {
    await screenshotStorage.setPaymentType(userId, selectedOptions.paymentType);
    await sendSelectionConfirmation(
      "Payment type",
      selectedOptions.paymentType
    );
  }

  if (paymentOptions.includes(option)) {
    await screenshotStorage.setPaymentOption(
      userId,
      selectedOptions.paymentOption
    );
    await sendSelectionConfirmation(
      "Subscription package",
      selectedOptions.paymentOption
    );
  }

  if (serviceOptions.includes(option)) {
    await screenshotStorage.setServiceOption(
      userId,
      selectedOptions.serviceOption
    );
    await sendSelectionConfirmation(
      "Service option",
      selectedOptions.serviceOption
    );
  }
}

async function handleSubscriptionAction(ctx, uniqueId, subscriptionAction) {
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
    } else {
      console.error("User subscription not found:", error);
    }
    // Update subscription status only if necessary
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
}
async function handleOptionAction(ctx, option) {
  try {
    const vipDiscountOptions = [
      "vip_10_%_off",
      "vip_20_%_off",
      "vip_30_%_off",
      "vip_50_%_off",
      "vip_reset_all",
    ];
    const settingsOptions = ["oneMonth", "threeMonth", "sixMonth", "oneYear"];

    if (vipDiscountOptions.includes(option)) {
      await handleVipDiscountChange(ctx);
    } else if (settingsOptions.includes(option)) {
      await handleSettingsChange(ctx);
    } else {
      // console.log("Invalid property name");
      return;
    }
  } catch (error) {
    console.error(`Error handling option ${option}:`, error);
    handleError(ctx, error);
  }
}
// Function to handle different types of errors
async function handleError(ctx, error) {
  try {
    if (error.response && error.response.status === 429) {
      if (ctx.update && ctx.update.callback_query) {
        await retryApiCall(() =>
          ctx.answerCallbackQuery({
            callback_query_id: ctx.update.callback_query.id,
            text: "Servers busy! Try again later.",
            show_alert: true,
          })
        );
      } else {
        console.log("No callback query found for 429 error");
      }
    } else if (error.response && error.response.status === 400) {
      if (ctx.update && ctx.update.callback_query) {
        await retryApiCall(() =>
          ctx.answerCallbackQuery({
            callback_query_id: ctx.update.callback_query.id,
            text: "Error with request. Try again!",
            show_alert: true,
          })
        );
      } else {
        console.log("No callback query found for 400 error");
      }
    } else if (error.message) {
      if (ctx.update && ctx.update.callback_query) {
        await retryApiCall(() =>
          ctx.answerCallbackQuery({
            callback_query_id: ctx.update.callback_query.id,
            text: "Something went wrong. Try again!",
            show_alert: true,
          })
        );
      } else {
        console.log("No callback query found for error message");
      }
    } else {
      console.error("Unknown error:", error);
      // Consider sending to logging service or endpoint
    }
  } catch (retryError) {
    console.error("Error handling retry:", retryError);
  }
}