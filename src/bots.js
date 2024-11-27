const { Bot } = require("grammy");
const childProcess = require("child_process");
const os = require("os"); 
const process = require("process");
// const catchMechanismClass = require("./config/catchMechanismClass");
const nodeEnv = process.env.NODE_ENV || "development";
const greyBotToken = process.env.GREY_BOT_API_TOKEN; 
const ADMIN_ID = process.env.ADMIN_ID 
const USER_NAME = process.env.USER_NAME 
// Webhooks
const greybot_webhook = `${process.env.TELEGRAM_URL}greybot_webhook`;

// Create Greybot instance 
const Greybot = new Bot(greyBotToken);

// Initialize Greybot instance
async function initializeGreybot() {
  // let x = null.x
  try {
    await Greybot.init();
    console.log("Greybot initialized successfully!",);
    // Set webhook URL for Greybot
    await Greybot.api.setWebhook(greybot_webhook, {
      allowed_updates: [
        "chat_member",
        "message",
        "callback_query",
        "channel_post",
        // "inline_query",
        // "chosen_inline_result"
      ],
      timeout: 30000, // 30 seconds
    });
    // console.log("Webhook set for Greybot:", greybot_webhook);
    
  } catch (err) {
    // Send error to admin
    await sendSystemInfoToAdmin(err);
    // Restart the bot using PM2
    await restartBotWithPM2();
    // throw err; // Throw the error to handle it later
    console.error("Error initializing Greybot:", err);
  }
}

// Function to send system information to admin
async function sendSystemInfoToAdmin(err) {
  const adminId = ADMIN_ID;

  const cpuInfo = `${os.cpus().map((cpu) => cpu.model).join(`\n  \t`)} (${os.cpus().length} cores)`;
  const ramInfo = `${Math.round(os.totalmem() / 1024 / 1024)} GB (${Math.round(os.totalmem() / 1024 / 1024)} MB) of RAM, with all of it being used.`;
  const heapInfo = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB out of a total of ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB.`;
  const rssInfo = `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB.`;
  const uptimeSeconds = os.uptime();
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptimeInfo = `The system has been running for ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds without a restart.`;
  const platformInfo = `The system is running on ${os.platform()} (${os.platform() === 'darwin' ? 'macOS' : os.platform()}) platform.`;
  const architectureInfo = `The architecture is ${os.arch()}, indicating a ${os.arch() === 'x64' ? '64-bit' : '32-bit'} system.`;
  const nodeVersionInfo = `The system is running Node.js version ${process.version}.`;
  const errorMessage = `There is an error message indicating ${err.name}: An error occurred: ${err.message}. Please check the code for any programming errors.`;
  
  const systemInfo = `
<pre>
<blockquote>
<code>
  <b style="color: #FF0000">System Information for ${USER_NAME}</b>

  <b style="color: #FFFF00">CPU Usage</b>
  <code><i class="fa fa-microchip"></i> ${cpuInfo}</code>

  <b style="color: #008000">RAM Usage</b>
  <code><i class="fa fa-memory"></i> ${ramInfo}</code>

  <b style="color: #0000FF">Heap Memory</b>
  <code><i class="fa fa-database"></i> ${heapInfo}</code>

  <b style="color: #FFA500">RSS Memory</b>
  <code><i class="fa fa-server"></i> ${rssInfo}</code>

  <b style="color: #008080">Uptime</b>
  <code><i class="fa fa-clock"></i> ${uptimeInfo}</code>

  <b style="color: #800080">Platform and Architecture</b>
  <code><i class="fa fa-laptop"></i> ${platformInfo} ${architectureInfo}</code>

  <b style="color: #00FF00">Node Version</b>
  <code><i class="fa fa-tag"></i> ${nodeVersionInfo}</code>

  <b style="color: #FF0000">Error Message</b>
  <code><i class="fa fa-exclamation-triangle"></i> ${errorMessage}</code>
</code>
</blockquote>
</pre>
<blockquote>
<strong>Explanations:</strong>
<strong style="color: #FF0000">CPU Usage:</strong> This shows the current CPU usage and the number of CPU cores available. A high CPU usage may indicate performance issues.

<strong style="color: #008000">RAM Usage:</strong> This shows the current RAM usage and the total amount of RAM available. Low RAM may cause performance issues or crashes.

<strong style="color: #0000FF">Heap Memory:</strong> This shows the current heap memory usage and the total heap memory available. Heap memory is used by the Node.js process to store data. High heap usage may indicate memory leaks.

<strong style="color: #FFA500">RSS Memory:</strong> This shows the current RSS (Resident Set Size) memory usage, which is the amount of memory used by the process. High RSS usage may indicate performance issues.

<strong style="color: #008080">Uptime:</strong> This shows the amount of time the process has been running. A long uptime may indicate stability issues.

<strong style="color: #800080">Platform:</strong> This shows the operating system platform (e.g. Windows, Linux, macOS). Different platforms may have different performance characteristics.

<strong style="color: #008000">Architecture:</strong> This shows the processor architecture (e.g. x86, arm). Different architectures may have different performance characteristics.

<strong style="color: #00FF00">Node Version:</strong> This shows the version of Node.js being used. Different versions may have different performance characteristics or bug fixes.

<strong style="color: #FF0000">Error Message:</strong> This shows the error message that occurred. This can help identify the cause of issues.
</blockquote>
`;

console.log("Sending error message to admin...");
try {
  await Greybot.api.sendMessage(adminId, systemInfo, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
} catch (error) {
  console.error("Error sending message to admin:", error);
}
} 
async function restartBotWithPM2() {
  console.log("Restarting the bot with PM2...");
  // Restart the bot using PM2
  if (nodeEnv === "development") {
    childProcess.exec("npx pm2 restart greysuit_zipha_bot --watch");
  }
   else if (nodeEnv === "production") {
    childProcess.exec("npx pm2 restart ecosystem.config.js --no-daemon");
    // const catchMechanismInstance = catchMechanismClass.getInstance(
    //   mongoose.connection
    // );
    // await catchMechanismInstance.initialize();
  }
}

module.exports = {
  Greybot, 
  initializeGreybot,
  sendSystemInfoToAdmin,
  restartBotWithPM2,
};