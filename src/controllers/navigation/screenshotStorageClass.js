

class ScreenshotStorage {
  constructor() {
    this.storage = new Map(); 
  }
  async addUser(userId, username) {
    const id = String(userId);
    if (!this.storage.has(id)) {
      const user = { 
        userId, 
        username, 
        screenshots: new Map(), 
        paymentOption: null,
        paymentType: null,
        serviceOption: null,
        isExpired: false,
        isActive: false,
      };
      this.storage.set(id, user);
    }
    // console.log(`User ${username} created`)
    return this.storage.get(id);
  }
  async addScreenshot(userId, screenshotData,packageType= "Generic") {
    const id = String(userId);
    const { photoId, messageId, username } = screenshotData;
    let userStorage = this.storage.get(id);
  
    if (!userStorage) {
      userStorage = await this.addUser(userId, username);
    } else {
      userStorage.username = username; // Update username if user exists
    }
  
    if (!userStorage.screenshots) {
      userStorage.screenshots = new Map();
    }
  
    if (!userStorage.screenshots.has(id)) {
      userStorage.screenshots.set(id, {
        userId,
        photoIds: [photoId],
        messageIds: [messageId],
        messageIdCount: 1, // Initialize messageIdCount
        channelMessageIds: [],
        paymentMessageIds: [],
        package:packageType,
        username,
      });
    } else {
      const existingScreenshot = userStorage.screenshots.get(id);
      existingScreenshot.photoIds.push(photoId);
      existingScreenshot.messageIds.push(messageId);
      existingScreenshot.messageIdCount++; // Increment messageIdCount
      userStorage.screenshots.set(id, existingScreenshot);
    }
  
    return userStorage;
  }
  async getMessageIdCount(userId) {
    const userStorage = this.storage.get(String(userId));
    if (!userStorage || !userStorage.screenshots) return null;
  
    const screenshot = userStorage.screenshots.get(String(userId));
    if (!screenshot) return null;
  
    return screenshot.messageIdCount;
  }
  async updateChannelAndPaymentMessageId(userId, channelMessageId,paymentMessageId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
  
    if (!userStorage || !userStorage.screenshots) {
      return;
    }
  
    const screenshot = userStorage.screenshots.get(id);
    screenshot.channelMessageIds.push(channelMessageId);
    screenshot.paymentMessageIds.push(paymentMessageId)
    userStorage.screenshots.set(id, screenshot);
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
    const timeout = 5000; // 5 seconds
  
    if (!userStorage || !userStorage.screenshots) {
      console.log(`No screenshots found for user ${userId}`);
      return;
    }
  
    const screenshots = Array.from(userStorage.screenshots.values());
  
    for (const screenshot of screenshots) {
      // Delete channel messages
      const channelMessageIds = screenshot.channelMessageIds;
      const chunkedChannelMessageIds = [];
      for (let i = 0; i < channelMessageIds.length; i += CHUNK_SIZE) {
        chunkedChannelMessageIds.push(channelMessageIds.slice(i, i + CHUNK_SIZE));
      }
  
      for (const chunk of chunkedChannelMessageIds) {
        await Promise.all(chunk.map(async (channelMessageId) => {
          try {
            await ctx.api.deleteMessage(channelId, channelMessageId);
            // console.log(`Deleted channel message ${channelMessageId} for user ${userId}`);
            deletedMessageIds.add(channelMessageId);
            screenshot.channelMessageIds.splice(screenshot.channelMessageIds.indexOf(channelMessageId), 1);
          } catch (error) {
            if (error.description === 'Bad Request: message to delete not found') {
              // console.log(`Message ${channelMessageId} already deleted, skipping...`);
              deletedMessageIds.add(channelMessageId);
              screenshot.channelMessageIds.splice(screenshot.channelMessageIds.indexOf(channelMessageId), 1);
            } else {
              console.error(`Error deleting channel message ${channelMessageId}:`, error);
              await new Promise(resolve => setTimeout(resolve, timeout));
              try {
                await ctx.api.deleteMessage(channelId, channelMessageId);
                // console.log(`Deleted channel message ${channelMessageId} for user ${userId} after retry`);
                deletedMessageIds.add(channelMessageId);
                screenshot.channelMessageIds.splice(screenshot.channelMessageIds.indexOf(channelMessageId), 1);
              } catch (error) {
                console.error(`Failed to delete channel message ${channelMessageId} after retry:`, error);
              }
            }
          }
        }));
      }
  
      // Delete user messages
      const userMessageIds = screenshot.messageIds;
      const chunkedUserMessageIds = [];
      for (let i = 0; i < userMessageIds.length; i += CHUNK_SIZE) {
        chunkedUserMessageIds.push(userMessageIds.slice(i, i + CHUNK_SIZE));
      }
  
      for (const chunk of chunkedUserMessageIds) {
        await Promise.all(chunk.map(async (messageId) => {
          try {
            await ctx.api.deleteMessage(userId, messageId);
            // console.log(`Deleted user message ${messageId} for user ${userId}`);
            deletedMessageIds.add(messageId);
            screenshot.messageIds.splice(screenshot.messageIds.indexOf(messageId), 1);
          } catch (error) {
            if (error.description === 'Bad Request: message to delete not found') {
              // console.log(`Message ${messageId} already deleted, skipping...`);
              deletedMessageIds.add(messageId);
              screenshot.messageIds.splice(screenshot.messageIds.indexOf(messageId), 1);
            } else {
              console.error(`Error deleting user message ${messageId}:`, error);
              await new Promise(resolve => setTimeout(resolve, timeout));
              try {
                await ctx.api.deleteMessage(userId, messageId);
                // console.log(`Deleted user message ${messageId} for user ${userId} after retry`);
                deletedMessageIds.add(messageId);
                screenshot.messageIds.splice(screenshot.messageIds.indexOf(messageId), 1);
              } catch (error) {
                console.error(`Failed to delete user message ${messageId} after retry:`, error);
              }
            }
          }
        }));
      }
  
    // Delete payment messages
    const paymentMessageIds = screenshot.paymentMessageIds;
    const chunkedPaymentMessageIds = [];
    for (let i = 0; i < paymentMessageIds.length; i += CHUNK_SIZE) {
      chunkedPaymentMessageIds.push(paymentMessageIds.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunkedPaymentMessageIds) {
      await Promise.all(chunk.map(async (paymentMessageId) => {
        try {
          await ctx.api.deleteMessage(userId, paymentMessageId);
          // console.log(`Deleted payment message ${paymentMessageId} for user ${userId}`);
          deletedMessageIds.add(paymentMessageId);
          screenshot.paymentMessageIds.splice(screenshot.paymentMessageIds.indexOf(paymentMessageId), 1);
        } catch (error) {
          if (error.description === 'Bad Request: message to delete not found') {
            // console.log(`Message ${paymentMessageId} already deleted, skipping...`);
            deletedMessageIds.add(paymentMessageId);
            screenshot.paymentMessageIds.splice(screenshot.paymentMessageIds.indexOf(paymentMessageId), 1);
          } else {
            console.error(`Error deleting payment message ${paymentMessageId}:`, error);
            await new Promise(resolve => setTimeout(resolve, timeout));
            try {
              await ctx.api.deleteMessage(userId, paymentMessageId);
              // console.log(`Deleted payment message ${paymentMessageId} for user ${userId} after retry`);
              deletedMessageIds.add(paymentMessageId);
              screenshot.paymentMessageIds.splice(screenshot.paymentMessageIds.indexOf(paymentMessageId), 1);
            } catch (error) {
              console.error(`Failed to delete payment message ${paymentMessageId} after retry:`, error);
            }
          }
        }
      }));
    }

    // Update storage with modified screenshot data
    this.storage.set(id, userStorage);
  }

  console.log("Finished deleting all screenshot messages for user", userId);
  return true;
  }
  async getScreenshot(userId) {
    // await this.addUser(userId);
    const id = String(userId);
    const userStorage = this.storage.get(id);
    return userStorage.screenshots.get(id); 
  }
  async getAllUsers() {
    const allUsers = [];
    for (const [id, userStorage] of this.storage) {
      allUsers.push({
        userId: id,
        username: userStorage.username,
        paymentOption: userStorage.paymentOption,
        paymentType: userStorage.paymentType,
        serviceOption: userStorage.serviceOption,
        isExpired: userStorage.isExpired,
        isActive: userStorage.isActive,
        screenshots: Array.from(userStorage.screenshots.values()),
      });
    }
    return allUsers;
  }
  async getAllScreenshots(userId) {
    const id = String(userId);
    const Storage = this.storage.get(id);
    const userStorage = Storage.screenshots.get(id)
  
    if (!userStorage.screenshots || userStorage.screenshots.size === 0) {
      return []; // Return empty array if screenshots is undefined or empty
    }
  
    const screenshots = [];
  
    userStorage.screenshots.forEach((screenshot, screenshotId) => {
      screenshots.push({
        screenshotId,
        userId: screenshot.userId,
        photoIds: screenshot.photoIds,
        messageIds: screenshot.messageIds,
        channelMessageIds: screenshot.channelMessageIds,
        paymentMessageIds: screenshot.paymentMessageIds,
      });
    });
  
    return screenshots;
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
      userStorage.username = null;
      userStorage.payment = null;
      userStorage.screenshots.clear();
    }
  }

  async removeScreenshot(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    userStorage.screenshots.delete(id);
    console.log("Removed screenshot from stack")
  }
  async clearAllScreenshots() {
    try {
      this.storage.clear();
      console.log("Storage cleared");
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }
  async removeUser(userId) {
    const id = String(userId);
    this.storage.delete(id);
    console.log("User removed from stack")
  }
  async updateSubscriptionStatus(userId, subscriptionStatus) {  
    const id = String(userId);
    const userStorage = this.storage.get(id);
  
    switch (subscriptionStatus) {
      case 'active':
        userStorage.isActive = true;
        userStorage.isExpired = false;
        // console.log(userStorage.isExpired,userStorage.isActive,"isExpired,isActive")
        break;
      case 'expired':
        userStorage.isExpired = true;
        userStorage.isActive = false;
        // console.log(userStorage.isExpired,userStorage.isActive,"isExpired,isActive")
        break;
      case 'inactive':
        userStorage.isActive = false;
        userStorage.isExpired = false;
        // console.log(userStorage.isExpired,userStorage.isActive,"isExpired,isActive")
        break;
      default:
        return;
    }
  
    // Save the updated user storage
    this.storage.set(id, userStorage);
  }
  async setPaymentOption(userId, value) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) {
      console.error(`User ${id} not found in storage`);
      return;
    }
    userStorage.paymentOption = value;
  }
  async getPaymentOption(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) {
      console.error(`User ${id} not found in storage`);
      return null;
    }
    return userStorage.paymentOption;
  }
  async setPaymentType(userId, value) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) {
      console.error(`User ${id} not found in storage`);
      return;
    }
    userStorage.paymentType = value;
  }
  async getPaymentType(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) {
      console.error(`User ${id} not found in storage`);
      return null;
    }
    return userStorage.paymentType;
  }
  async getServiceOption(userId) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) {
      console.error(`User ${id} not found in storage`);
      return null;
    }
    return userStorage.serviceOption;
  }
  async setServiceOption(userId, value) {
    const id = String(userId);
    const userStorage = this.storage.get(id);
    if (!userStorage) {
      console.error(`User ${id} not found in storage`);
      return;
    }
    userStorage.serviceOption = value;
  }
  async getScreenshotStorageData(userId) {
    const id = String(userId);
    const screenshotStorageOptions = this.storage.get(id);;
    if (!screenshotStorageOptions) {
      throw new Error(`Screenshot storage options not found for userId: ${userId}`);
    }
    const screenshotStorageData = {
      userId: id,
      username: screenshotStorageOptions?.username,
      screenshots: screenshotStorageOptions?.screenshots,
      paymentOption: screenshotStorageOptions?.paymentOption,
      paymentType: screenshotStorageOptions?.paymentType,
      serviceOption: screenshotStorageOptions?.serviceOption,
      isExpired: screenshotStorageOptions?.isExpired,
      isActive: screenshotStorageOptions?.isActive,
    };
  
    return screenshotStorageData;
  }
  async addAllUsers(users) {
    if (!Array.isArray(users)) {
      throw new Error('Invalid users array');
    }
    for (const user of users) {
      if (typeof user?.userId !== 'number' && typeof user?.userId !== 'string') {
        // console.log('User ID must be a number or string'); 
        continue
      } 
      const id = String(user.userId);
      
      if (!this.storage.has(id)) { 
        const newUser = {
          userId: user.userId, 
          username: user.username,
          screenshots: new Map(),
          paymentOption: user.paymentOption || null,
          paymentType: user.paymentType || null,
          serviceOption: user.serviceOption || null,
          isExpired: user.isExpired || false,
          isActive: user.isActive || false,
        };
        
        // Add screenshots
        if (user.screenshots) {
          for (const screenshotId in user.screenshots) {
            newUser.screenshots.set(screenshotId, user.screenshots[screenshotId]);
          }
        }
        
        try {
          this.storage.set(id, newUser);
          // console.log(`User ${user.username} added to storage`);
        } catch (error) {
          console.error(`Error adding user to storage: ${error}`);
        }
      } else {
        console.log(`User ${user.username} already exists in storage`);
      }
    }
    // return this.storage;
  }
}

const screenshotStorage = new ScreenshotStorage();
module.exports = screenshotStorage;