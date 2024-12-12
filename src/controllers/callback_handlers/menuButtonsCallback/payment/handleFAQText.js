const { groupInfo } = require("../../../../menuInfo");
const { Navigation } = require("../../../navigation/navigationClass");

exports.handleFAQText = async (ctx, direction) => {
  try {
    const navigation = Navigation.getInstance();
    // const direction = ctx.update.callback_query.data;
    const faqArray = groupInfo["FAQs"];
    let currentIndex = direction.includes("_")
      ? direction.split("_")[1]
      : direction;

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
      inline_keyboard: [
        [
          { text: "Prev", callback_data: "prev_faq" },
          { text: "Next", callback_data: "next_faq" },
        ],
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

    switch (direction) {
      case "FAQ":
        const previousMessageId =
          userMenuOptions.previousMenuMessageId.get("FAQ");
        await deletePreviousMessage(previousMessageId);
        navigation.setFAQIndex(ctx.from.id, 0);
        const faqText = faqArray[0];
        await ctx.api.sendMessage(ctx.chat?.id, faqText, {
          reply_markup: replyMarkup,
          parse_mode: "HTML",
        });
        break;

      case `next_${currentIndex}`:
        const nextPreviousMessageId =
          userMenuOptions.previousMenuMessageId.get(direction);
        await deletePreviousMessage(nextPreviousMessageId);
        const nextIndex = (parseInt(currentIndex) + 1) % faqArray.length;
        navigation.setFAQIndex(ctx.from.id, nextIndex);

        const nextFaqText = faqArray[nextIndex];
        await editMessageText(nextFaqText);
        break;

      case `prev_${currentIndex}`:
        const prevPreviousMessageId =
          userMenuOptions.previousMenuMessageId.get(direction);
        await deletePreviousMessage(prevPreviousMessageId);

        const prevIndex =
          (parseInt(currentIndex) - 1 + faqArray.length) % faqArray.length;
        navigation.setFAQIndex(ctx.from.id, prevIndex);

        const prevFaqText = faqArray[prevIndex];
        await editMessageText(prevFaqText);

        break;

      default:
        console.log("Invalid direction");
    }
  } catch (error) {
    console.error("Error in handleFAQText:", error);
  }
};