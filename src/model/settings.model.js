const { Schema, model, models } = require("mongoose");

const Settings = new Schema({
  userId: { type: Number, unique: true },
  settings: {
    type: Object,
    properties: {
      language: { type: String, default: "en" },
      notificationPreferences: { type: Boolean, default: false },
      nairaPrice: { type: Number, default: 1500 },
      vipPrice: {
        type: Object,
        properties: {
          oneMonth: { type: Number, default: 52 },
          threeMonths: { type: Number, default: 130 },
          sixMonths: { type: Number, default: 240 },
          oneYear: { type: Number, default: 400 },
        },
      },
      vipDiscountPrice: {
        type: Object,
        properties: {
          oneMonth: { type: Number, default: 52 },
          threeMonths: { type: Number, default: 130 },
          sixMonths: { type: Number, default: 240 },
          oneYear: { type: Number, default: 400 },
        },
      },
    },
  },  
});

// Check if the model already exists before creating a new one
module.exports = models['settings'] || model('settings', Settings );