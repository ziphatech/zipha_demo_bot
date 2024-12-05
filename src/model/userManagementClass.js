const User = require("./user.model");
const fs = require("fs");
const path = require("path");
const { Greybot } = require("../bots");
const ADMIN_ID = process.env.ADMIN_ID;
const skipUpdateOptions = [
  "one_on_one_price_list",
  "mentorship_price_list",
  "$10,000 - $49,000",
  "$50,000 - $1 million",
  "bootcamp_payment"
];
class UserInfo {
  static allUsers = []; // Store all instances

  static defaultValues = {
    userId: null,
    username: null,
    fullName: null,
    subscription: {
      type: null,
      expirationDate: null,
      status: null,
    },
    inviteLink: {
      link: null,
      name: null,
    },
    groupMembership: {
      joinedAt: null,
      groupId: null,
    },
  };

  constructor(data) {
    this.userId = data?.userId;
    this.username = data?.username;
    this.fullName = data?.fullName;
    this.subscription = {
      type: data.subscription?.type,
      expirationDate: data.subscription?.expirationDate,
      status: data.subscription?.status,
    };
    this.inviteLink = {
      link: data.inviteLink?.link,
      name: data.inviteLink?.name,
    };
    this.groupMembership = {
      joinedAt: data.groupMembership?.joinedAt,
      groupId: data.groupMembership?.groupId,
    };
    UserInfo.allUsers.push(this);
  }

  async addMultipleUsers(usersData) {
    if (!Array.isArray(usersData)) {
      throw new Error("Invalid users data");
    }
    try {
      for (const userData of usersData) {
        this.updateData(userData);
      }
    } catch (error) {
      console.error(`Error adding users: ${error.message}`);
      throw error;
    }
  }

  static getAllUsersData() {
    return UserInfo.allUsers;
  }

  static getUserById(userId) {
    if (!UserInfo.allUsers) {
      throw new Error("User data not initialized");
    }
    return UserInfo.allUsers.find((user) => user.userId === userId);
  }
  setUserProperties(userId, username, ctx) {
    this.userId = userId;
    this.username = username;
    this.fullName = `${ctx.from?.first_name} ${ctx.from?.last_name}`;
  }
  // resetUserInfo() {
  //   Object.assign(this, UserInfo.defaultValues);
  // }
  resetUserInfo() {
    this.userId = null;
    this.username = null;
    this.fullName = null;
    this.subscription = {
      type: null,
      expirationDate: null,
      status: null,
    };
    this.inviteLink = {
      link: null,
      name: null,
    };
    this.groupMembership = {
      joinedAt: null,
      groupId: null,
    };
  }
  updateData(newData) {
    const {
      userId,
      username,
      fullName,
      subscription = {},
      inviteLink = {},
      groupMembership = {},
    } = newData ?? {};

    this.userId = userId || this.userId;
    this.username = username || this.username;
    this.fullName = fullName || this.fullName;

    this.subscription = {
      type: subscription.type || this.subscription.type,
      expirationDate:
        subscription.expirationDate || this.subscription.expirationDate,
      status: subscription.status || this.subscription.status,
    };

    this.inviteLink = {
      link: inviteLink.link || this.inviteLink.link,
      name: inviteLink.name || this.inviteLink.name,
    };

    this.groupMembership = {
      joinedAt: groupMembership.joinedAt || this.groupMembership.joinedAt,
      groupId: groupMembership.groupId || this.groupMembership.groupId,
    };
  }

  setExpirationDate(expirationDate) {
    this.subscription.expirationDate = expirationDate;
  }
  subscriptionStatus(status) {
    this.subscription.status = status;
  }

  subscribe(type) {
    this.subscription.type = type;
  }

  getSubscriptionType() {
    return this.subscription.type;
  }

  storeUserLink(link, name) {
    this.inviteLink.link = link;
    this.inviteLink.name = name;
  }

  getUserLink() {
    return this.inviteLink;
  }
  getUserSubscription() {
    return this.subscription;
  }

  leaveGroup() {
    this.groupMembership.groupId = null;
    this.groupMembership.joinedAt = null;
  }

  async saveUserToDB() {
    try {
      // Check user status before updating
      const existingUser = await User.findOne({ userId: this.userId });
      // Check if user has selected an option that shouldn't update the database
      if (skipUpdateOptions.includes(this.subscription.type)) {
        return; // Exit function without updating
      }
      if (existingUser && existingUser.subscription.status === "active") {
        this.subscription.status = "active";
        console.log("User status is active, skipping database update.");
        return; // Exit function without updating
      } else if (
        existingUser &&
        existingUser.subscription.status === "expired"
      ) {
        this.subscription.status = "expired";
        console.log("User status is expired, skipping database update.");
        return; // Exit function without updating
      }
      const userData = {
        userId: this.userId,
        username: this.username,
        fullName: this.fullName,
        subscription: this.subscription,
        inviteLink: this.inviteLink,
        groupMembership: this.groupMembership,
      };

      await User.findOneAndUpdate(
        { userId: this.userId },
        { $set: userData },
        { new: true, upsert: true }
      );
    } catch (error) {
      // console.error("Error saving user to DB:", error);

      // Send error notification to admin via Telegram bot
      const systemInfo = `
        Error Message: Failed to update user info
        Error Details: ${error.message}
        User Details: 
        ${JSON.stringify(
          {
            userId: this.userId,
            username: this.username,
            fullName: this.fullName,
            subscription: this.subscription,
            groupMembership: this.groupMembership,
            inviteLink: this.inviteLink,
          },
          null,
          2
        )}
      `;
      await Greybot.api.sendMessage(ADMIN_ID, systemInfo);
    }
  }

  static getSubscriptionInfo() {
    return User.findOne({ userId: this.userId }).then((user) => {
      if (user) {
        return {
          type: user.subscription.type,
          expirationDate: user.subscription.expirationDate,
          status: user.subscription.status,
        };
      } else {
        return null; // or throw an error
      }
    });
  }

  static getAllUsers() {
    return User.find()
      .then((users) => {
        // Map the users into a custom structure
        const userList = users.map((user) => ({
          id: user._id,
          userId: user.userId,
          username: user.username,
          fullName: user.fullName,
          subscription: {
            type: user.subscription.type,
            expirationDate: user.subscription.expirationDate,
            status: user.subscription.status,
          },
          inviteLink: {
            link: user?.inviteLink?.link,
            name: user?.inviteLink?.name,
          },
          groupMembership: {
            groupId: user.groupMembership.groupId,
            joinedAt: user.groupMembership.joinedAt,
          },
        }));

        // Define the file path
        const filePath = path.join(__dirname, "users.json");

        // Write the user list to the file
        fs.writeFileSync(filePath, JSON.stringify(userList, null, 2), "utf-8");

        console.log("User data successfully written to users.json");
        return userList;
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        throw err;
      });
  }

  static findDuplicateUsersByFullName() {
    // Define the path to the JSON file
    const filePath = path.join(__dirname, "users.json");

    // Read the file and parse it as JSON
    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Create a map to track occurrences of each fullName
    const fullNameCountMap = {};
    const duplicates = [];

    // Iterate over the users and count the occurrences of each fullName
    users.forEach((user) => {
      const fullName = user.fullName;

      // If fullName is not present in the user object, skip this user
      if (!fullName) return;

      // If fullName already exists in the map, push this user as a duplicate
      if (fullNameCountMap[fullName]) {
        duplicates.push(user);
      } else {
        // Otherwise, mark this fullName as seen
        fullNameCountMap[fullName] = true;
      }
    });

    // Log or return the list of duplicate users
    if (duplicates.length > 0) {
      console.log("Duplicate users found:", duplicates);
    } else {
      console.log("No duplicate users found.");
    }

    return duplicates;
  }

  static async updateUser(userId, updateData) {
    try {
      const user = await User.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, upsert: true }
      );
      // console.log(user, "final update");
      return user;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async getUserManagementData(userId) {
    if (this.userId !== userId) {
      throw new Error(
        `User ID mismatch: Expected ${this.userId} but received ${userId}`
      );
    }

    return {
      userId: this.userId,
      username: this.username,
      fullName: this.fullName,
      subscription: this.subscription,
      inviteLink: this.inviteLink,
      groupMembership: this.groupMembership,
    };
  }
}

module.exports = {
  UserInfo,
};
