
class ScreenshotStorage {
  constructor() {
    this.storage = new Map(); // userId -> UserStorage
  }

  async addUser(userId, username) {
    const id = String(userId);
    if (!this.storage.has(id)) {
      const user = {
        userId,
        username,
        screenshots: [],
        paymentOption: null,
        paymentType: null,
        package: null,
        serviceOption: null,
        isExpired: false,
        isActive: false,
      };
      this.storage.set(id, user);
    }
    return this.storage.get(id);
  }

  async addScreenshot(userId, screenshotData, packageType = "Generic") {
    const id = String(userId);
    const { photoId, messageId, username } = screenshotData;
   
    let userStorage = this.storage.get(id);
  
    if (!userStorage) {
      userStorage = await this.addUser(userId, username);
    } else {
      userStorage.username = username;
    }
  
    // Update the user package
    userStorage.package = packageType;
  
    // Check if screenshot with same messageId already exists
    const exists = userStorage.screenshots.some(s => s.messageId === messageId);
    if (!exists) {
      const newScreenshot = {
        photoId,
        messageId,
      };
      userStorage.screenshots.push(newScreenshot);
    }
    // console.log(userStorage,"userStorage")
  
    this.storage.set(id, userStorage);
    return userStorage;
  }
  

  async getMessageIdCount(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) throw new Error("User storage not found");
    return userStorage.screenshots.length;
  }

  async updateChannelAndPaymentMessageId(userId, messageId, channelMessageId, paymentMessageId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage || userStorage.screenshots.length === 0) return;
  
    const targetScreenshot = userStorage.screenshots.find(s => s.messageId === messageId);
    if (!targetScreenshot) return;
  
    targetScreenshot.channelMessageId = channelMessageId;
    targetScreenshot.paymentMessageId = paymentMessageId;
  
    this.storage.set(id, userStorage);
  }  

  async getUserStorage(userId) {
    const id = String(userId);
    return this.storage.get(id);
  }

  async deleteAllScreenshotMessages(ctx, userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    const channelId = process.env.APPROVAL_CHANNEL_ID;
    const deletedMessageIds = new Set();
    const CHUNK_SIZE = 10;
    const timeout = 5000;

    if (!userStorage || !userStorage.screenshots.length) {
      console.log(`No screenshots found for user ${userId}`);
      return true;
    }

    const channelMessageIds = [];
    const messageIds = [];
    const paymentMessageIds = [];

    for (const screenshot of userStorage.screenshots) {
      if (screenshot.channelMessageId) channelMessageIds.push(screenshot.channelMessageId);
      if (screenshot.messageId) messageIds.push(screenshot.messageId);
      if (screenshot.paymentMessageId) paymentMessageIds.push(screenshot.paymentMessageId);
    }

    const processDeletion = async (ids, deleteFn) => {
      const chunkedIds = [];
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        chunkedIds.push(ids.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of chunkedIds) {
        await Promise.all(chunk.map(async (msgId) => {
          try {
            await deleteFn(msgId);
            deletedMessageIds.add(msgId);
          } catch (error) {
            if (error.description === "Bad Request: message to delete not found") {
              deletedMessageIds.add(msgId);
            } else {
              console.error(`Error deleting message ${msgId}:`, error);
              await new Promise(res => setTimeout(res, timeout));
              try {
                await deleteFn(msgId);
                deletedMessageIds.add(msgId);
              } catch (retryError) {
                console.error(`Failed to delete message ${msgId} after retry:`, retryError);
              }
            }
          }
        }));
      }

      return ids.filter(msgId => !deletedMessageIds.has(msgId));
    };

    await processDeletion(channelMessageIds, msgId => ctx.api.deleteMessage(channelId, msgId));
    await processDeletion(messageIds, msgId => ctx.api.deleteMessage(userId, msgId));
    await processDeletion(paymentMessageIds, msgId => ctx.api.deleteMessage(userId, msgId));

    console.log("Finished deleting all screenshot messages for user", userId);
    return true;
  }

  async getScreenshot(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (userStorage) {
      return {
        username: userStorage.username,
        screenshots: userStorage.screenshots,
      };
    } else {
      throw new Error("Screenshot data not found");
    }
  }

  async getAllUsers() {
    const allUsers = [];
    for (const [, userStorage] of this.storage.entries()) {
      allUsers.push({ ...userStorage, screenshots: [...userStorage.screenshots] });
    }
    return allUsers;
  }

  async getAllScreenshots(userId) {
    const id = String(userId);
    return this.storage.get(id)?.screenshots ?? [];
  }

  async updateUserStorage(userId, updatedUserStorage) {
    const id = String(userId);
    if (this.storage.has(id)) {
      this.storage.set(id, updatedUserStorage);
    } else {
      console.error(`User ${id} not found in storage`);
    }
  }

  async resetScreenshotStorage(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (userStorage) {
      userStorage.paymentOption = null;
      userStorage.paymentType = null;
      userStorage.serviceOption = null;
      userStorage.isExpired = false;
      userStorage.isActive = false;
      userStorage.username = '';
      userStorage.screenshots = [];
      userStorage.package = ''
      this.storage.set(id, userStorage);
    }
  }

  async removeScreenshot(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (userStorage && userStorage.screenshots.length > 0) {
      userStorage.screenshots.pop();
      console.log("Removed latest screenshot from stack for user", id);
      this.storage.set(id, userStorage);
    }
  }

  async clearAllScreenshots() {
    try {
      for (const [id, userStorage] of this.storage.entries()) {
        userStorage.screenshots = [];
        this.storage.set(id, userStorage);
      }
      console.log("All user screenshots cleared");
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }

  async removeUser(userId) {
    const id = String(userId);
    this.storage.delete(id);
    console.log("User removed from stack");
  }

  async updateSubscriptionStatus(userId, subscriptionStatus) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) return;

    switch (subscriptionStatus) {
      case "active":
        userStorage.isActive = true;
        userStorage.isExpired = false;
        break;
      case "expired":
        userStorage.isExpired = true;
        userStorage.isActive = false;
        break;
      case "inactive":
        userStorage.isActive = false;
        userStorage.isExpired = false;
        break;
      default:
        return;
    }

    this.storage.set(id, userStorage);
  }

  async setPaymentOption(userId, value) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) return console.error(`User ${id} not found in storage`);
    userStorage.paymentOption = value;
  }

  async getPaymentOption(userId) {
    return this.storage.get(String(userId))?.paymentOption ?? null;
  }

  async setPaymentType(userId, value) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) return console.error(`User ${id} not found in storage`);
    userStorage.paymentType = value;
  }

  async getPaymentType(userId) {
    return this.storage.get(String(userId))?.paymentType ?? null;
  }

  async getServiceOption(userId) {
    return this.storage.get(String(userId))?.serviceOption ?? null;
  }

  async setServiceOption(userId, value) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) return console.error(`User ${id} not found in storage`);
    userStorage.serviceOption = value;
  }

  async getScreenshotStorageData(userId) {
    const userStorage = this.storage.get(String(userId));
    if (!userStorage) throw new Error(`Screenshot storage options not found for userId: ${userId}`);
    return {
      userId: userStorage.userId,
      username: userStorage.username,
      screenshots: [...userStorage.screenshots],
      package:userStorage.package,
      paymentOption: userStorage.paymentOption,
      paymentType: userStorage.paymentType,
      serviceOption: userStorage.serviceOption,
      isActive: userStorage.isActive,
      isExpired: userStorage.isExpired,
    };
  }
  /**
 * Add multiple users to the storage.
 */
async addAllUsers(users) {
  if (!Array.isArray(users)) throw new Error("Invalid users array");
  
  for (const user of users) {
    if (!user?.userId) continue;

    const id = String(user.userId);

    if (!this.storage.has(id)) {
      const newUser = {
        userId: user.userId,
        username: user.username,
        screenshots: Array.isArray(user.screenshots) ? user.screenshots : [],
        package:user.package ?? null,
        paymentOption: user.paymentOption ?? null,
        paymentType: user.paymentType ?? null,
        serviceOption: user.serviceOption ?? null,
        isExpired: user.isExpired ?? false,
        isActive: user.isActive ?? false,
      };

      try {
        this.storage.set(id, newUser);
      } catch (error) {
        console.error(`Error adding user to storage: ${error}`);
      }
    }
  }
}

}




const screenshotStorage = new ScreenshotStorage()
module.exports = screenshotStorage;