const Coupon = require("../../../model/couponClass");
const { createUserInstance } = require("../../../model/userInfo_singleton");
const { Navigation } = require("../../navigation/navigationClass");
const { EXPIRATION_DATES } = require("./constants");
const { handleSelectionConfirmation } = require("./selectionConfirmation");
const couponInstance = Coupon.getInstance();

exports.handleNavigationAction = async (ctx, navigationAction, option) => {
  try { 
      const navigation = Navigation.getInstance()
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