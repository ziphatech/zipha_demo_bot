const { Greybot } = require("./bots");
const { handleMessages } = require("./controllers/messages/messageHandler");
const {
  handleChannelPost,  
} = require("./controllers/callback_handlers/handleChannelPost");
const { session } = require("grammy"); 
const {
  menuOptionsCallback,
} = require("./controllers/callback_handlers/menuOptionsCallback");
const nav = require("./controllers/navigation/navigation_singleton");
const {
  handleChatMember,
} = require("./controllers/callback_handlers/handleChatMembers");
const schedule = require('node-schedule');
const {
  checkSubscription,  
  // checkExpiredUsersRemoved
} = require("./controllers/callback_handlers/checkSubscriptionStatus");
const Broadcast = require("./controllers/navigation/broadcast_singleton");   
const { UserInfo } = require("./model/userManagementClass"); 
const channelId = process.env.VIP_SIGNAL_ID

exports.GreyBotHandler = async () => { 

  const broadcast = Broadcast()
  const navigation = nav();
  Greybot.use(
    session({
      initial: () => ({ step: "idle" }),
    })
  );
  Greybot.on("chat_member", async (ctx) => { 
    await handleChatMember(ctx);
  }); 
  Greybot.on("message", (ctx) => handleMessages(ctx, broadcast));
  Greybot.on("channel_post", handleChannelPost);
  Greybot.on("callback_query:data", menuOptionsCallback);  
 
 
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