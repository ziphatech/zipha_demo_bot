const mongoose = require("mongoose");
const { Greybot } = require("../bots");
const catchMechanismClass = require("./catchMechanismClass");
const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]; // percentage thresholds
const warningMessages = [
"Database size: 10% full. Monitoring recommended.",
"Database size: 20% full. Please consider optimizing your data.",
"Database size: 30% full. Optimization advised.",
"Database size: 40% full. Action suggested to avoid performance issues.",
"Database size: 50% full. Attention required to maintain efficiency.",
"Database size: 60% full. Action required to avoid performance issues.",
"Database size: 70% full. Critical: please free up space soon.",
"Database size: 80% full. Critical: please free up space immediately.",
"Database size: 90% full. Emergency: database is almost full!",
"Database size: 100% full. Emergency: database is full!",
];
async function trackDatabaseSize(db) {
  try {
    const stats = await db.stats();
    const dataSize = stats.dataSize;
    const totalSize = stats.storageSize;
    const kilobytes = totalSize / 1024;
    const megabytes = totalSize / 1024 / 1024;
    const numObjects = stats.objects; // Number of documents (objects)
    const avgObjectSize = stats.avgObjSize; // Average object size
    // console.log(`Total storage size: ${totalSize} bytes`);
    // console.log(`Total storage size: ${kilobytes} KB`);
    // console.log(`Total storage size: ${megabytes} MB`);

    const percentage = (dataSize / totalSize) * 100;
    const adminChatId = process.env.ADMIN_ID;

    const message = `
    <pre>
      Database size: ${dataSize} bytes
      Total storage size: ${totalSize} bytes
      Total storage size: ${kilobytes} KB
      Total storage size: ${megabytes} MB
      Number of Users: ${numObjects}
      Average User Data Size: ${avgObjectSize} bytes
      Percentage used: ${percentage.toFixed(2)}%
    </pre>
    `;

    console.log(message);

    for (const [index, threshold] of thresholds.entries()) {
      if (percentage >= threshold) {
        console.log(`Threshold exceeded: ${threshold}%`);
        const fullMessage = `<strong>${warningMessages[index]}</strong>\n${message}`;
        await Greybot.api.sendMessage(adminChatId,fullMessage, {parse_mode:"HTML"});
      } 
    }
  } catch (error) {
    console.error(`Error tracking database size: ${error}`);
  }
}

async function handleMongooseConnectionEvents() {
  mongoose.connection.on("connected", async () => {
    console.log("Connected to MongoDB successfully!");
  });

  mongoose.connection.on("open", async () => {
    console.log("MongoDB connection is now open!");
  });

  mongoose.connection.on("disconnected", async () => {
    console.log("Disconnected from MongoDB. Trying to reconnect...");
  });

  mongoose.connection.on("reconnected", async () => {
    console.log("Reconnected to MongoDB successfully!");
  });

  mongoose.connection.on("disconnecting", async () => {
    console.log("Disconnecting from MongoDB...");
  });

  mongoose.connection.on("close", async () => {
    console.log("MongoDB connection is now closed.");
  });
}
async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_CONNECT, {
      autoIndex: false,
      bufferCommands: false,
      serverSelectionTimeoutMS: 50000,
      maxPoolSize: process.env.MONGO_POOLSIZE || 5,
    });
    await handleMongooseConnectionEvents();
    console.log("Connected to MongoDB successfully!");
    const catchMechanismInstance = catchMechanismClass.getInstance(
      mongoose.connection
    );
    await catchMechanismInstance.initialize();
    // await trackDatabaseSize(mongoose.connection.db);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

module.exports = {
  connectDB,
};
 