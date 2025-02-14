const {
  vipSignalOptions,
  generateMenu,
  paymentMethod,
  brokerOptions,
  mentorshipOption,
  partnershipOption,
  fundManagementOption,
  fundManagementTermsOne,
  fundManagementTermsTwo,
  fundManagementOptionDocs,
  propFirmOptions,
  settingsOptions,
  vipSignalDiscount,
  bootCampBtn,
  vipPrice,
} = require("../callback_handlers/menuButtons");
const { settingsClass } = require("../callback_handlers/settings/settingsClass");
const USER_ID = Number(process.env.USER_ID);

const menuButtons = (userId, settingsDoc, discountPrices) => {
  const { oneMonth, threeMonth, sixMonth, oneYear } = discountPrices;

  return [
    {
      name: "Main Menu",
      options: generateMenu(USER_ID, userId),
    },
    {
      name: "Vip Signal",
      options: vipSignalOptions(settingsDoc),
    },
    {
      name: "1 Month",
      price: oneMonth,
      options: paymentMethod,
    },
    {
      name: "3 Months",
      price: threeMonth,
      options: paymentMethod,
    },
    {
      name: "6 Months",
      price: sixMonth,
      options: paymentMethod,
    },
    {
      name: "12 Months",
      price: oneYear,
      options: paymentMethod,
    },
    {
      name: "Group Mentorship Fee - $300",
      options: paymentMethod,
    },
    {
      name: "1 - On - 1     Fee - $1100",
      options: paymentMethod,
    },
    {
      name: "$10,000 - $49,000",
      options: fundManagementTermsOne,
    },
    {
      name: "$50,000 - $1 million",
      options: fundManagementTermsTwo,
    },
    {
      name: "Agree One $1000",
      options: paymentMethod,
    },
    {
      name: "Agree Two",
      options: fundManagementOptionDocs,
    },
    {
      name: "Prop Firm",
      options: propFirmOptions,
    },
    {
      name: "Fund Management",
      options: fundManagementOption,
    },
    {
      name: "Vip Discount Price",
      options: vipSignalDiscount,
    },
    {
      name: "Vip Prices",
      options: vipPrice,
    },
    {
      name: "Mentorship",
      options: mentorshipOption,
    },
    {
      name: "Partnership",
      options: partnershipOption,
    },
    {
      name: "Broker",
      options: brokerOptions,
    },
    {
      name: "Pay Fee: $79.99",
      options: paymentMethod
    },
    {
      name:"3 Days BootCamp",
      options: bootCampBtn
    },
    {
      name: "Settings",
      options: settingsOptions,
    },
  ];
};
const menuOptions = (userId) => {
  const settings = settingsClass();
  const settingsDoc = settings.settings;
  const discountPrices = settingsDoc?.vipDiscountPrice;

  return menuButtons(userId, settingsDoc, discountPrices).reduce(
    (menuAcc, button) => {
      if (button.price) {
        menuAcc[`${button.name} - $${button.price}`] = button.options;
      } else {
        menuAcc[button.name] = button.options;
      }
      return menuAcc;
    },{});
};
function getMenuOptions(option, userId) {
  const menuResult = menuOptions(userId);
  return menuResult[option] || []; // Return an empty array by default if option is not found
}

module.exports = { getMenuOptions };
