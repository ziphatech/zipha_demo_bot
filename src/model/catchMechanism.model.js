const { Schema, model, models } = require('mongoose');

const catchMechanismSchema = new Schema({
  userId: { type: Number, unique: true },
  userMenu: {
    type: Object,
    properties: {
      userId: { type: Number, unique: true },
      stack: [String],
      previousMenuMessageId: Object,
      inviteLinkId: { type: Number, default: null },
    },
  },
  userManagement: {
    type: Object,
    properties:  {
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
    },
  }},
  screenshotStorage: {  
    type: Object,
    properties: {
      userId: String,
      username: String,
      screenshots: {
        type: Object,
        properties: {
          userId: String,
          username: String,
          photoIds: [Number],
          messageIds: [Number],
          messageIdCount: Number,
          channelMessageIds: [Number],
          paymentMessageIds: [Number],
        },
      },
      paymentOption: String,
      paymentType: String,
      serviceOption: String,
      isExpired: Boolean,
      isActive: Boolean,
    },
  },
  // status: {
  //   type: String,
  //   enum: ['pending', 'inactive', 'active'],
  // },
  // timestamp: Date,
  // expirationDate: Date,
});

module.exports = models['CatchMechanism'] || model('CatchMechanism', catchMechanismSchema);