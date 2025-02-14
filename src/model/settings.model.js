const { Schema, model, models } = require("mongoose");

const Settings = new Schema({
  userId: { type: Number, unique: true },
  settings: { 
    type: Object,
    properties: {
      language: { type: String, default: "en" },
      notificationPreferences: { type: Boolean, default: false },
      nairaPrice: { type: Number, default: 1700 },
      vipPrice: {
        type: Object,
        properties: {
          oneMonth: { type: Number, default: 63 },
          threeMonths: { type: Number, default: 160 },
          sixMonths: { type: Number, default: 300 },
          oneYear: { type: Number, default: 500 },
        },
      },
      vipDiscountPrice: {
        type: Object,
        properties: {
          oneMonth: { type: Number, default: 63 },
          threeMonths: { type: Number, default: 160 },
          sixMonths: { type: Number, default: 300 },
          oneYear: { type: Number, default: 500 },
        },
      },
      codeGeneration: [{
        couponId: String,
        username:String,
        options: [{
          callback_data: String,
          text: String
        }],
        redeemed: Boolean,
        timestamps: Date,
        couponCode: String,
      }]
    }
  },  
});

// Check if the model already exists before creating a new one
module.exports = models['settings'] || model('settings', Settings );