const { Greybot } = require("./bots");
const { session } = require("grammy"); 
const schedule = require('node-schedule');
const Broadcast = require("./controllers/navigation/broadcast_singleton");    
const { UserInfo } = require("./model/userManagementClass"); 
const { menuOptionsCallback } = require("./controllers/callback_handlers/menuOptions/menuOptionsCallback");
const { checkSubscription,
  //  getSubscriptionStatus,
  //   updateUserExpirationByJoinDate
   } = require("./controllers/callback_handlers/channelHandlers/handleSubscription/checkSubscriptionStatus");
const { handleChatMember } = require("./controllers/callback_handlers/channelHandlers/handleChatMembers/handleChatMembers");
const { handleChannelPost } = require("./controllers/callback_handlers/channelHandlers/handleChannelPost/handleChannelPost");
const { handlePollAnswer } = require("./controllers/callback_handlers/handlePoll/handlePollAnswer");
const { handleMessages } = require("./controllers/callback_handlers/messageHandler/messageHandler");
const { Navigation } = require("./controllers/navigation/navigationClass");
const channelId = process.env.VIP_SIGNAL_ID 

exports.GreyBotHandler = async () => { 

  const broadcast = Broadcast()
  const navigation = Navigation.getInstance();
  // const userId = 5969422886
  Greybot.use(
    session({
      initial: () => ({ step: "idle" }),
    }) 
  );
  Greybot.on("chat_member", async (ctx) => { 
    await handleChatMember(ctx);
  }); 
  Greybot.on("message", (ctx) => {
    
    // updateUserExpirationByJoinDate(userId)
    // getSubscriptionStatus(ctx)
    handleMessages(ctx, broadcast)});
  Greybot.on("channel_post", handleChannelPost);
  Greybot.on("callback_query:data", menuOptionsCallback); 
  Greybot.on('poll_answer', handlePollAnswer); 
 
  
  // schedule.scheduleJob('*/1 * * * *', async () => {
  //   console.log("Checking....")
  //   // await checkSubscriptionStatus(); 
  //   // await checkExpiredUsersRemoved() 
  //   // UserInfo.findDuplicateUsersByFullName()
  //   // updateUsersExpirationByJoinDate()

  //   console.log("Done Checking....")   
  // }); 
  schedule.scheduleJob('0 0 0 * * *', async () => {
    console.log("Checking....")
    await checkSubscription(channelId);
    console.log("Checking....")
  });
  //Runs maintainance every monday morning
  schedule.scheduleJob('0 0 0 * * 1', async () => { 
    console.log("Checking....")
    await navigation.performMaintenance(Greybot);
    console.log("Checking....")
  }); 
}; 