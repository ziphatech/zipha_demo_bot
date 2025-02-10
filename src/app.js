require("dotenv").config();
const express = require("express");
const { webhookCallback } = require("grammy");
const app = express();

const {
  Greybot,
  initializeGreybot,
  sendSystemInfoToAdmin,
  restartBotWithPM2,
  MessageBot,
} = require("./bots");
const axios = require("axios")
const { GreyBotHandler } = require("./greybot");
const { connectDB } = require("./config/connectDB");
const { rateLimiter } = require("./config/rateLimiter");
const schedule = require('node-schedule');
const { MongoClient } = require('mongodb');
const { settingsClass } = require("./controllers/callback_handlers/settings/settingsClass");
const mongoUrl = process.env.DB_CONNECT;
const settings = settingsClass()

MongoClient.connect(mongoUrl, async function(err, client) {
  if (err) { 
    console.log(err);
  } else {
    console.log('Connected to MongoDB');
    const db = client.db('rate-limiter');
    const rateLimiterMiddleware = rateLimiter(client, db);
    app.use(rateLimiterMiddleware);
  }
});

app.use(express.json());

// Webhook route for Greybot

app.post("/greybot_webhook", (req, res) => {
  webhookCallback(Greybot, "express")(req, res).catch((error) => {
    console.error("Error handling Greybot webhook:", error);
    res.status(500).send("Internal Server Error");
  });
});

app.post("/messagebot_webhook", (req, res) => {
  webhookCallback(MessageBot, "express")(req, res).catch((error) => {
    console.error("Error handling MessageBot webhook:", error);
    res.status(500).send("Internal Server Error");
  });
});

// Keep-alive route
app.get("/keepalive", (req, res) => {
 // Perform a simple task to keep the server active
  const timestamp = new Date().getTime();
  console.log(`Keep-alive timestamp: ${timestamp}`);
  res.send(`Server is alive (timestamp: ${timestamp})`);
});
 
// Start Express server
const PORT = process.env.PORT || 3000;   
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);  

  try {
    await connectDB();
    // Initialize bots
    await initializeGreybot();
    // await initializeMessageBot();

    // Start bot handlers
    await GreyBotHandler();  
    await settings.getSettings()
    // await MessageBotHandler();
  } catch (error) {
    console.log("Exicuted....")
    await sendSystemInfoToAdmin(error);
    console.log("Done Executing....")
    // Restart the bot using PM2
    await restartBotWithPM2();
    console.error("Error handling automatic request:", error);
  }  
     
   // Keep-alive function to prevent the server from idling
   const keepAlive = () => {
    axios.get(`${process.env.TELEGRAM_URL}keepalive`)
      .then(response => {
        console.log('Ping response:', response.data);
      })
      .catch(error => {
        console.log('Keep-alive error:', error.message);
      });
  };

// Schedule the keepAlive function to run every 14 minutes using cron
// The cron expression '*/14 * * * *' means every 14 minutes
  schedule.scheduleJob('*/5 * * * *', keepAlive);
  // cron.schedule('*/1 * * * *', async () => {
  //   await navigation.performMaintenance(Greybot);
  // });
  // cron.schedule('*/1 * * * *', keepAlive);
  // https://api.telegram.org/bot6838294498:AAFPp8GmfywnkMdhD-iGXvnNsN0F9-vTpD0/getChat
});