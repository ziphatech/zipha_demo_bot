const screenshotStorage = require("../navigation/screenshotStorage_singleton");
const Broadcast = require("../navigation/broadcast_singleton");
const expectedChannelId = [Number(process.env.APPROVAL_CHANNEL_ID)];
const expectedPostChannlId = [Number(process.env.PUBLIC_CHANNEL_ID),
  Number(process.env.VIP_SIGNAL_ID)
];
const { InlineKeyboard } = require("grammy");

async function handleChannelPost(ctx) {
  try {
    const senderId = ctx.me?.id;
    const ADMIN_ID = process.env.GREYBOT_ID;
    const channelType = ctx.update.channel_post?.chat?.type;
    const channelId = ctx.update.channel_post?.chat?.id;
    const appealMessage = ctx.update.channel_post?.text;
    const postPhoto = ctx.update.channel_post?.photo;
    const postCaption = ctx.update.channel_post?.caption;
    const appealMessageId = ctx.update.channel_post?.message_id;
    const keyword = String(process.env.QUERY_KEY_WORD);
   
    const broadcast = Broadcast(channelId,);
    function resetBroadcast() {
      broadcast.active = false;
      broadcast.message = null;
      broadcast.userId = {};
      broadcast.messageId = null;
    }
    if (channelType === "channel" && expectedPostChannlId.includes(channelId)) {

      const keyboard = new InlineKeyboard().url(
        "CONTACT US",
        process.env.BOT_URL
      );
      
        const lowerCasePostMessage = appealMessage?.toLowerCase();
        const lowerCasePostCaption = postCaption?.toLowerCase();
        
      if (lowerCasePostMessage?.includes(keyword.toLowerCase())) {
        const updatedMessage = appealMessage.replace(keyword, " ");
      
        await ctx.api.deleteMessage(channelId, appealMessageId);
        
        await ctx.api.sendMessage(channelId, updatedMessage, {
          reply_markup: keyboard,
        });
       
      } else if (
        postPhoto &&
        lowerCasePostCaption?.includes(keyword.toLowerCase())
      ) {
        const updatedCaption = postCaption.trim().replace(keyword, " ");

        await ctx.api.deleteMessage(channelId, appealMessageId);

        await ctx.api.sendPhoto(channelId, postPhoto[0].file_id, {
          caption: updatedCaption,
          reply_markup: keyboard,
        });
      }
    }
    // Check if broadcast userId is valid
   
    if (!!(broadcast && broadcast.userId && broadcast.userId.userID)) {
      const {
        userID: userId,
        photoId,
        messageID: originalMessageId,
        action,
      } = broadcast.userId;

      // Define constants
      const isAdmin = senderId === Number(ADMIN_ID);
      const isBroadcastActive = broadcast.active;

      // Check permissions and channel type
      if (!isAdmin || !isBroadcastActive) {
        console.error("Unauthorized or broadcast inactive");
        return;
      }

      if (channelType !== "channel" || !expectedChannelId.includes(channelId)) {
        console.error("Invalid channel type or ID");
        return;
      }

      const caption = `
<blockquote> 
${appealMessage}
</blockquote>
<i>Please verify payment and send a screenshot again.</i> 
  `;

      try {
        
      // Handle appeal action
      if (action === "appeal" && originalMessageId) {
          // Send photo and delete original message
          await sendPhotoAndDeleteOriginal(ctx, userId, photoId, caption,broadcast,channelId);
          setTimeout(async () => {
            await screenshotStorage.deleteAllScreenshotMessages(ctx, userId);
            resetBroadcast();
          }, 1000);
        }
      } catch (error) {
        console.error("Error processing appeal:", error);
        await sendErrorMessage(ctx, error);
      }
    } else {
      console.error("Invalid broadcast userId");
    }
  } catch (error) {
    console.error(`Error handling message: ${error}`);
    await sendErrorMessage(ctx, error);
  }
}
async function sendPhotoAndDeleteOriginal(ctx, userId, photoId, caption,broadcast,channelId) {
  if(photoId){
    await ctx.api.sendPhoto(userId, photoId, { caption, parse_mode: "HTML" });
  }
  await ctx.api.deleteMessage(broadcast.message.chat.id, broadcast.messageId);

  // Delete appeal message after 1 second
  const appealMessageId = ctx.update.channel_post.message_id;
  setTimeout(async () => {
    await ctx.api.deleteMessage(channelId, appealMessageId);
  }, 1000);

  // Send success message and delete after 5 seconds
  const sendMessage = await ctx.reply("Message sent successfully.");
  if (sendMessage) {
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(
          sendMessage.chat.id,
          sendMessage.message_id
        );
      } catch (deleteError) {
        console.error("Error deleting message:", deleteError);
      }
    }, 5000);
  }
}

async function sendErrorMessage(ctx, error) {
  const errorMessage = `Sorry, something went wrong. Please try again later. (Error: ${error.message})`;
  const replyMsg = await ctx.reply(errorMessage);

  setTimeout(async () => {
    try {
      await ctx.api.deleteMessage(replyMsg?.chat?.id, replyMsg.message_id);
    } catch (deleteError) {
      console.error("Error deleting reply message:", deleteError);
    }
  }, 5000);
}

module.exports = {
  handleChannelPost,
};