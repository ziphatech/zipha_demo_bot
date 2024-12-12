// /src/controllers/callback_handlers/menuButtonsCallback/payment/approval/handleUpdateError.js

exports.handleUpdateError = async (error, updateData, ctx) => {
    const systemInfo = `
      Error Message: Failed to update user info
      Error Details: ${error.message}
      User Details:
      UserID: ${updateData.userId}
      ${JSON.stringify(updateData, null, 2)}
    `;
  
    const userErrorMessage =
    "We haven't received the updated information from you. Add a username to your Telegram if you haven't done so. To complete verification, clear your chat history, follow the previous procedure, and resend the screenshot. This ensures you can join the channel and your information can be properly tracked and updated.";
  
    const adminErrorMessage = `Error updating user info for ${updateData.userId}. Please investigate.`;
  
    await ctx.api.sendPhoto(updateData.userId, process.env.CLEAR_CATCH_PHOTO_ID, {
      caption: userErrorMessage,
      parse_mode: "HTML",
    });
    if (error && Object.keys(error).length > 0) {
      await ctx.api.sendMessage(process.env.ADMIN_ID, error);
    }
  
    if (systemInfo && adminErrorMessage) {
      await ctx.api.sendMessage(
        process.env.ADMIN_ID,
        systemInfo + "\n" + adminErrorMessage
      );
    }
  };