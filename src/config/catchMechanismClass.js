const screenshotStorage = require("../controllers/navigation/screenshotStorageClass");
const { createUserInstance } = require("../model/userInfo_singleton");
const catchMechanismModel = require("../model/catchMechanism.model");
const { Navigation } = require("../controllers/navigation/navigationClass");
const navigation = Navigation.getInstance();
class catchMechanismClass {
  constructor(db) {
    this.db = db;
    this.collectionName = "catchMechanism";
    this.CatchMechanismModel = catchMechanismModel;
  }

  async initialize() {
    try {
      const users = await this.CatchMechanismModel.find({});

      await Promise.all(users.map((user) => this.updateUserCatchClasses(user)));
    } catch (error) {
      console.error("Error initializing user classes:", error);
    }
  }

  async storeUserData(userId, userData) {
    const user = new this.CatchMechanismModel({ userId, ...userData });
    await user.save();
  }
  async getUserData(userId) {
    try {
      const userData = await this.CatchMechanismModel.findOne({ userId });
      if (!userData) {
        throw new Error(`User data not found for ${userId}`);
      }
      return userData;
    } catch (error) {
      console.error(`Error retrieving user data for ${userId}:`, error);
      throw error;
    }
  }
  async updateUserService(userId, updates) {
    await this.CatchMechanismModel.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );
  }
  async addCatchMechanism(userId) {
    try {
      const userMenuData = await navigation.getSingleUserMenu(userId);
      const userManagementData = await createUserInstance.getUserManagementData(userId);
      const screenshotStorageData = await screenshotStorage.getScreenshotStorageData(userId);
  
      const updates = {
        userMenu: userMenuData,
        userManagement: userManagementData,
        screenshotStorage: screenshotStorageData,
      };
  
      const result = await this.CatchMechanismModel.findOneAndUpdate(
        { userId },
        { $set: updates },
        { new: true, upsert: true }
      );
  
      // console.log(`User collective information updated for ${userId}`, result);
  
      // const screenshots = result.screenshotStorage?.screenshots || [];
  
      // screenshots.forEach((screenshot, index) => {
      //   console.log(`Screenshot ${index + 1}:`);
      //   console.log("Photo ID:", screenshot.photoId);
      //   console.log("Message ID:", screenshot.messageId);
      //   console.log("Channel Message ID:", screenshot.channelMessageId);
      //   console.log("Payment Message ID:", screenshot.paymentMessageId);
      // });
  
      return result;
    } catch (error) {
      console.error(`Error updating user collective information for ${userId}:`, error);
      return null;
    }
  }
  
  async updateUserCatchClasses(user) {
    const userMenu = user.userMenu;
    const userManagement = user.userManagement;
    const screenshotData = user.screenshotStorage;

    // Transform userMenu to array
    // Update UserMenu class
    await navigation.addAllUsersToMenu([userMenu]);
    // console.log(userMenuClass, "userMenuClass")

    // Update UserManagement class
    await createUserInstance.addMultipleUsers([userManagement]);
    // console.log(userManagement, "userManagementClass")

    // Update ScreenshotStorage class
    await screenshotStorage.addAllUsers([screenshotData]);
    // console.log(screenshotStorage.getScreenshot(userId), "screenshotStorageClass")
  }
  async removeUserManagementAndScreenshotStorage(userId) {
    try {
      const result = await this.CatchMechanismModel.findOneAndUpdate(
        { userId },
        { $unset: { userManagement: 1, screenshotStorage: 1 } },
        { new: true }
      );
      //   console.log("Updated Doc:", result);
      return result;
    } catch (error) {
      console.error(`Error removing user management: ${error.message}`);
      throw error;
    }
  }
  async removeCatchMechanism(userId) {
    try {
      const result = await this.CatchMechanismModel.findOneAndDelete({
        userId,
      });
      return result;
    } catch (error) {
      console.error(
        `Error removing user from catch mechanism: ${error.message}`
      );
      throw error;
    }
  }
  async addInviteLinkToCatchMechanism(userId, inviteLinkId) {
    const filter = { userId };
    const update = { $set: { "userMenu.inviteLinkId": inviteLinkId } };
    const result = await this.CatchMechanismModel.findOneAndUpdate(
      filter,
      update,
      { new: true }
    );
    return result;
  }
  async removeUserData(userId) {
    await this.CatchMechanismModel.findOneAndDelete({ userId });
  }

  async updateUserMenu(userId, userMenuUpdates) {
    await this.CatchMechanismModel.findOneAndUpdate(
      { userId },
      { $set: { userMenu: userMenuUpdates } },
      { new: true }
    );
  }

  async updateUserManagement(userId, userManagementUpdates) {
    await this.CatchMechanismModel.findOneAndUpdate(
      { userId },
      { $set: { userManagement: userManagementUpdates } },
      { new: true }
    );
  }

  async updateScreenshotStorage(userId, screenshotStorageUpdates) {
    await this.CatchMechanismModel.findOneAndUpdate(
      { userId },
      { $set: { screenshotStorage: screenshotStorageUpdates } },
      { new: true }
    );
  }
  async initializeCatchMechanisms() {
    const catchMechanisms = await this.CatchMechanismModel.find({});
    const bulkWriteOperations = catchMechanisms.map((catchMechanism) => {
      return {
        updateOne: {
          filter: { userId: catchMechanism.userId },
          update: {
            $set: {
              userMenu: catchMechanism.userMenu,
              userManagement: catchMechanism.userManagement,
              screenshotStorage: catchMechanism.screenshotStorage,
            },
          },
          upsert: true,
        },
      };
    });

    await this.CatchMechanismModel.bulkWrite(bulkWriteOperations);
  }
  static instance;

  static getInstance(db) {
    if (!catchMechanismClass.instance) {
      catchMechanismClass.instance = new catchMechanismClass(db);
    }
    return catchMechanismClass.instance;
  }
}

module.exports = catchMechanismClass;
