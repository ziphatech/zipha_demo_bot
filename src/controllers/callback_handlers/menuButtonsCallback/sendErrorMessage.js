const { retryApiCall } = require("../../../utilities");

exports.sendError = async (ctx, text)=> {
    if (!ctx.update || !ctx.update.callback_query) {
      console.error("Missing callback query or update context");
      return;
    }
  
    const callbackQueryId = ctx.update.callback_query.id;
  
    try { 
      await retryApiCall(() =>
        ctx.answerCallbackQuery({
          callback_query_id: callbackQueryId,
          text: "An unexpected error occurred. Please try again later.", // Ensure text length limit
          show_alert: true,
        })
      );
    } catch (error) {
      console.error("Error sending error message:", error);
      // Optional: Send error report to administrator
    }
  } 

  