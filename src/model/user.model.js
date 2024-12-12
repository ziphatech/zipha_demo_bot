const {Schema, model,models} = require('mongoose');

const User = new Schema({
  userId: { type: Number, unique: true },
  username: String,
  fullName: String,
  subscription: {
    type: Object,
    properties: {
      type: String,
      expirationDate: { type: Schema.Types.Double }, // Using Double type
      status: String
    }
  },
  inviteLink: {
    type: Object,
    properties: {
      link: String,
      name: String
    }
  },
  groupMembership: { 
    type: Object,
    properties: {
      groupId: { type: Schema.Types.Int32 },  // Updated to Int32 for better precision
      joinedAt: Date
    }
  }
});

// Check if the model already exists before creating a new one
module.exports = models['telegram-bot-users'] || model('telegram-bot-users', User);