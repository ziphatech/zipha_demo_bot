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

module.exports = {
    paymentTypes,
    paymentOptions,
    serviceOptions,
    SubscriptionStatus,
    EXPIRATION_DATES,
};