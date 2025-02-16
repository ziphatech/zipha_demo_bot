const { groupInfo } = require("../../../../menuInfo");
const { Navigation } = require("../../../navigation/navigationClass");

exports.handleFAQText = async (ctx, direction) => {
  try {
    const navigation = Navigation.getInstance();
    const faqArray = groupInfo["FAQs"];
    let currentIndex = navigation.getFAQIndex(ctx.from.id);

    // Initialize previousMenuMessageId if it doesn't exist
    if (!navigation.userMenuOptions.has(ctx.from.id)) {
      navigation.userMenuOptions.set(ctx.from.id, {
        stack: [],
        previousMenuMessageId: new Map(),
        faqIndex: 0,
      });
    } 
    const userMenuOptions = navigation.userMenuOptions.get(ctx.from.id);
    const replyMarkup = {
      inline_keyboard: faqArray.length > 5
        ? [
            [
              { text: "<< Prev", callback_data: "prev_faq" },
              { text: "Next >>", callback_data: "next_faq" },
            ],
            [
              {
                text: "Main Menu",
                callback_data: "mainmenu",
              },
            ],
          ]
        : [
            [
              {
                text: "Main Menu",
                callback_data: "mainmenu",
              },
            ],
          ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    const deletePreviousMessage = async (previousMessageId) => {
      if (previousMessageId !== null) {
        try {
          await ctx.api.deleteMessage(ctx.chat?.id, previousMessageId);
        } catch (error) {
          if (
            error.error_code === 400 &&
            error.description === "Bad Request: message to delete not found"
          ) {
            console.log(
              `Message to delete not found. Skipping delete operation.`
            );
          } else {
            console.log("Error deleting reply message:");
          }
        }
      }
    };
   

    const editMessageText = async (faqText) => {
      try {
        await ctx.api.editMessageText(
          ctx.chat?.id,
          ctx.update.callback_query.message.message_id,
          faqText,
          {
            reply_markup: replyMarkup,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }
        );
      } catch (error) {
        if (
          error.error_code === 400 &&
          error.description === "Bad Request: message to edit not found"
        ) {
          console.log("Message to edit not found. Skipping edit.");
        } else {
          throw error;
        }
      }
    };
    let previousMessageId
    switch (direction) {
      case `next_${currentIndex}`:
        const nextIndex = (currentIndex + 5) % faqArray.length;
      
        previousMessageId = userMenuOptions.previousMenuMessageId.get(`next_${currentIndex}`);
        const nextFaqText = getFaqText(nextIndex, 5);
        await deletePreviousMessage(previousMessageId);
        navigation.setFAQIndex(ctx.from.id, nextIndex);
        await editMessageText(nextFaqText);
        break;

      case `prev_${currentIndex}`:
        const prevIndex = (currentIndex - 5 + faqArray.length) % faqArray.length;
        previousMessageId =
        userMenuOptions.previousMenuMessageId.get(`prev_${currentIndex}`);
        const prevFaqText = getFaqText(prevIndex, 5);
        await deletePreviousMessage(previousMessageId);
        navigation.setFAQIndex(ctx.from.id, prevIndex);
        await editMessageText(prevFaqText);
        break;

      case "FAQ":
        navigation.setFAQIndex(ctx.from.id, 0);
        const faqText = getFaqText(0, 5);
        await ctx.api.sendMessage(ctx.chat?.id, faqText, {
          reply_markup: replyMarkup,
          parse_mode: "HTML",
        });
        break;

      default:
        console.log("Invalid direction");
    }
  } catch (error) {
    console.error("Error in handleFAQText:", error);
  }
};

const getFaqText = (startIndex, count) => {
  let faqText = "";
  for (let i = startIndex; i < startIndex + count && i < groupInfo["FAQs"].length; i++) {
    faqText += `<strong>${groupInfo["FAQs"][i].question}</strong>\n\n<blockquote>${groupInfo["FAQs"][i].answer}</blockquote>\n\n`;
  }
  return faqText;
};
  

// const getFaqText = (startIndex, count) => {
//   let faqText = "";
//   for (let i = startIndex; i < startIndex + count && i < groupInfo["FAQs"].length; i++) {
//     const faqObject = groupInfo["FAQs"][i];
//     const question = faqObject.question;
//     const answer = faqObject.answer;
//     faqText += `<b>Q: ${question}</b>\n${answer}\n\n`;
//   }
//   return faqText;
// }