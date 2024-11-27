const {
  mainMenuOptions,
  vipSignalOptions, 
  paymentMethod,
  brokerOptions,
  mentorshipOption,
  partnershipOption,
  fundManagementOption,
  fundManagementTermsOne,
  fundManagementTermsTwo,
  fundManagementOptionDocs,
  propFirmOptions,
  menuWithSettingOption,
  settingsOptions,
  vipSignalDiscount,
  vipPrice,
} = require("../callback_handlers/menuButtons");
const { settingsClass } = require("./settingsClass");
const USER_ID = Number(process.env.USER_ID);

const menuOptions = (userId) => {
  const settings = settingsClass();
  const settingsDoc = settings.settings;
  const { oneMonth, threeMonth, sixMonth, oneYear } =
    settingsDoc?.vipDiscountPrice;

  return {
    "Main Menu": userId === USER_ID ? menuWithSettingOption : mainMenuOptions,
    "Vip Signal": vipSignalOptions(settingsDoc),
    [`1 Month - $${oneMonth}`]: paymentMethod,
    [`3 Months - $${threeMonth}`]: paymentMethod,
    [`6 Months - $${sixMonth}`]: paymentMethod,
    [`12 Months - $${oneYear}`]: paymentMethod,
    "Group Mentorship Fee - $250": paymentMethod,
    "1 - On - 1     Fee - $1100": paymentMethod,
    "$10,000 - $49,000": fundManagementTermsOne,
    "$50,000 - $1 million": fundManagementTermsTwo,
    "Agree One $1000": paymentMethod,
    "Agree Two": fundManagementOptionDocs,
    Mentorship: mentorshipOption,
    Partnership: partnershipOption,
    Broker: brokerOptions,
    "Prop Firm": propFirmOptions,
    "Fund Management": fundManagementOption,
    Settings: settingsOptions,
    "Vip Discount Price": vipSignalDiscount,
    "Vip Prices": vipPrice,
  };
};

function getMenuOptions(option, userId) {
  // console.log(userId,"userId",ADMIN_ID)
  const menuResult = menuOptions(userId);
  return menuResult[option] || []; // Return an empty array by default if option is not found
}

module.exports = { getMenuOptions };
