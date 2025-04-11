const axios = require('axios');
const { Greybot } = require('./bots');
const { UserInfo } = require('./model/userManagementClass');
const userModel = require('./model/user.model');
 
/**
 * Retry API calls with exponential backoff and randomized delay.
 * 
 * @param {Function} func - API function to retry.
 * @param {Object} options - Optional settings.
 * @param {number} [options.maxRetries=3] - Maximum retry attempts.
 * @param {number} [options.initialRetryDelay=2000] - Initial retry delay (ms).
 * @param {number} [options.maxRetryDelay=30000] - Maximum retry delay (ms).
 * @param {number} [options.jitter=100] - Randomized delay jitter (ms).
 * 
 * @returns {Promise<any>} Resolved API call result or error.
 */
async function retryApiCall(func, options = {}) {
  const {
    maxRetries = 3,
    initialRetryDelay = 2000,
    maxRetryDelay = 30000,
    jitter = 100,
  } = options;

  let retryDelay = initialRetryDelay;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await func();
    } catch (error) {
      if (error.message.includes("Request timed out")) {
        // Retry on timeout error
        // console.log("Timeout error, retrying...");
        return
      } else if (error.message.includes("Forbidden: bot can't initiate conversation")) {
        // Handle forbidden error
        // console.log("Forbidden error, stopping retries...");
        return
      } else {
        // Handle other errors
        console.log("Error occurred, stopping retries...");
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff with randomized delay
        retryDelay = Math.min(maxRetryDelay, retryDelay * 2);
        const randomizedDelay = retryDelay + Math.random() * jitter;
        await new Promise(resolve => setTimeout(resolve, randomizedDelay));
        attempt++;
      } else {
        throw error; // All retries failed
      }
    }
  }
}

const convertToNGN = async (amount, data) => {
  try {
    if (!data || typeof data === 'object' && Object.keys(data).length === 0) {
      throw new Error("Data is null, undefined, or empty");
    }

    if (!data.conversion_rates || typeof data.conversion_rates === 'object' && Object.keys(data.conversion_rates).length === 0) {
      throw new Error("conversion_rates is null, undefined, or empty");
    }

    if (!data.conversion_rates.NGN) {
      throw new Error("NGN conversion rate not found in data");
    }

    const ngExchangeRate = data.conversion_rates?.NGN;
    // const ExchangeRate = ngExchangeRate + (ngExchangeRate * 6.33 / 100);
    const totalAmount = amount *  ngExchangeRate ;
    const amountInNGN = parseInt(totalAmount)
    const flexibleExchangeRate = ngExchangeRate.toFixed(0)
    return { amountInNGN, flexibleExchangeRate };
  } catch (error) {
    console.error("Error in convertToNGN:", error);
    return { error: 'Failed to convert to NGN' }; 
  }
}; 

async function updateCurrencyExchange() {
  try {
    const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY
    if (!CURRENCY_API_KEY) {
      throw new Error("CURRENCY_API_KEY is not set");
    }

    const response = await axios.get('https://v6.exchangerate-api.com/v6/' + CURRENCY_API_KEY + '/latest/USD');

    if (response.status !== 200) {
      throw new Error(`Failed to retrieve currency data. Status: ${response.status}`);
    }

    const data = response.data;
    return data;
  } catch (error) {
    if (error.response) {
      console.error(`Error in updateCurrencyExchange: ${error.response.status} - ${error.response.statusText}`);
      return { error: 'Failed to retrieve currency data' }; 
    } else if (error.request) {
      console.error('Error in updateCurrencyExchange: No response received');
      return { error: 'Failed to retrieve currency data' }; 
    } else {
      console.error('Error in updateCurrencyExchange:', error.message);
      return { error: 'Failed to retrieve currency data' }; 
    }
  }
}


const wordsToNumbers = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,

  // Function to calculate numbers beyond 12
  calculate: function(months) {
    let totalMonths = 0;
    const yearRegex = /(\d+) years?/;
    const monthRegex = /(\d+) months?/;

    let yearMatch = months.match(yearRegex);
    let monthMatch = months.match(monthRegex);

    if (yearMatch) {
      totalMonths += parseInt(yearMatch[1]) * 12;
    }

    if (monthMatch) {
      totalMonths += parseInt(monthMatch[1]);
    }

    return totalMonths;
  },

  // Function to convert word to number
  toNumber: function(word) {
    if (word <= 12) {
      return this[word];
    } else {
      return this.calculate(word);
    }
  },
};
 
const numbersToWords = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',

  // Function to convert numbers beyond 12 to words
  toWord: function(number) {
    if (number <= 12) {
      return this[number];
    } else {
      const years = Math.floor(number / 12);
      const remainingMonths = number % 12;
      let yearWord = years === 1 ? 'year' : 'years';
      let monthWord = '';

      if (remainingMonths > 0) {
        monthWord = this[remainingMonths] || remainingMonths;
        monthWord += remainingMonths === 1 ? ' month' : ' months';
      }

      return `${years} ${yearWord}${monthWord ? ' and ' + monthWord : ''}`;
    }
  },
}; 

async function updateSubscriptionAndExpirationDate(userId, newSubscriptionType) {
  const currentUserInfo = await userModel.findOne({ userId });

  if (!currentUserInfo) {
    throw new Error(`User not found: ${userId}`);
  }
 
  const currentSubscriptionType = currentUserInfo.subscription.type;
  const currentExpirationDate = currentUserInfo.subscription.expirationDate;

  const currentMonths = wordsToNumbers[currentSubscriptionType?.split('_')[0]];
  const newMonths = wordsToNumbers[newSubscriptionType?.split('_')[0]];

  const totalMonths = currentMonths + newMonths;

  const remainingDays = Math.ceil((currentExpirationDate - Date.now()) / (24 * 60 * 60 * 1000));
  const newExpirationDate = Date.now() + (remainingDays + totalMonths * 30) * 24 * 60 * 60 * 1000;

  let subscriptionTypeWord;
  if (totalMonths > 12) {
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    subscriptionTypeWord = `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? 'and ' + remainingMonths + ' month' + (remainingMonths > 1 ? 's' : '') : ''}`.trim();
  } else if (totalMonths === 12) {
    subscriptionTypeWord = "1 year";
  } else {
    subscriptionTypeWord = `${numbersToWords[totalMonths]}_month${totalMonths > 1 ? 's' : ''}`; // Added month string
  }
  
  // Update user subscription and expiration date
  await UserInfo.updateUser(userId, {
    subscription: {
      type: subscriptionTypeWord,
      expirationDate: newExpirationDate,
      status: "active"
    },
  });  

  // return { newSubscriptionType, newExpirationDate }; 
}

/**
 * Generates a caption for payment verification.
 *
 * @param {Object} ctx - Telegram context object.
 * @param {string} serviceOption - Selected service package.
 * @param {string} paymentOption - Selected payment option.
 * @param {string} paymentType - Selected payment type.
 * @returns {string} Formatted caption.
 */
function generateCaption(ctx, serviceOption, paymentOption = null, paymentType = null, type = null) {
  const fullName = `<code>${ctx.from?.last_name} ${ctx.from?.first_name}</code>`;
  const userName = `<code>@${ctx.from?.username}</code>`;
  const userIdentifier = userName || fullName || "No User Name";

  const serviceInfo = serviceOption ?? "No Service Package selected";

  let paymentInfo, paymentTypeInfo, appealText;

  if (type === "Free") {
    paymentTypeInfo = "Gift Free Package.";
    appealText = "Please verify this Gift Package";
    return `<blockquote>
<strong>${userIdentifier}</strong> 
 
<strong>${serviceInfo}</strong> 

<strong>${paymentTypeInfo}</strong> 
</blockquote>
<i>${appealText}</i>
  `;
  } else {
    paymentInfo = paymentOption ?? "No Payment Option selected";
    paymentTypeInfo = paymentType ?? "No payment Type selected";
    appealText = "Please approve or appeal this payment";

    return `
    <blockquote>
      ${userIdentifier}
      
      ${serviceInfo}
      
      ${paymentInfo}
      
      ${paymentTypeInfo}
    </blockquote>
    <i>${appealText}</i>
  `;
  }

 
}


module.exports = {
  generateCaption,
  convertToNGN,
  updateCurrencyExchange,
  retryApiCall,
  updateSubscriptionAndExpirationDate
  // getNewInviteLink
}; 