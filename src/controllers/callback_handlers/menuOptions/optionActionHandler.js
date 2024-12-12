const { handleSettingsChange } = require('../settings/handleSettingsChange');
const { handleVipDiscountChange } = require('../settings/handleVipDiscountChange');
const { handleError } = require("./errorHandler");

exports.handleOptionAction = async (ctx, option) => {
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
        }
    } catch (error) {
        console.error(`Error handling option ${option}:`, error);
        handleError(ctx, error);
    }
};