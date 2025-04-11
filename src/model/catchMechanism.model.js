const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

// 1. ScreenshotData Schema
const ScreenshotDataSchema = new Schema({
  photoId: { type: String, default: 0 },             // ✅ single number
  messageId: { type: Number, default: 0 },
  channelMessageId: { type: Number, default: 0 },
  paymentMessageId: { type: Number, default: 0 },
}, { _id: false });

// 2. ScreenshotStorage Schema (uses ScreenshotData)
const ScreenshotStorageSchema = new Schema({
  userId: String,
  username: String,
  screenshots: [ScreenshotDataSchema], // ✅ updated
  package:String,
  paymentOption: String,
  paymentType: String,
  serviceOption: String,
  isExpired: Boolean,
  isActive: Boolean,
}, { _id: false });

// 3. Subscription Schema
const SubscriptionSchema = new Schema({
  type: String,
  expirationDate: Number, // Timestamp in milliseconds
  status: String,
}, { _id: false });

// 4. InviteLink Schema
const InviteLinkSchema = new Schema({
  link: String,
  name: String,
}, { _id: false });

// 5. GroupMembership Schema
const GroupMembershipSchema = new Schema({
  groupId: Number,
  joinedAt: Date,
}, { _id: false });

// 6. UserManagement Schema
const UserManagementSchema = new Schema({
  userId: Number,
  username: String,
  fullName: String,
  subscription: SubscriptionSchema,
  inviteLink: InviteLinkSchema,
  groupMembership: GroupMembershipSchema,
}, { _id: false });

// 7. UserMenu Schema
const UserMenuSchema = new Schema({
  userId: Number,
  stack: [String],
  previousMenuMessageId: Schema.Types.Mixed,
  inviteLinkId: { type: Number, default: null },
}, { _id: false });

// 8. Main Document Schema
const CatchMechanismSchema = new Schema({
  userId: { type: Number, unique: true, required: true },
  userMenu: { type: UserMenuSchema, required: true },
  userManagement: { type: UserManagementSchema, required: true },
  screenshotStorage: { type: ScreenshotStorageSchema, required: true },
});

// 9. Export the Model
const CatchMechanism = models.CatchMechanism || model("CatchMechanism", CatchMechanismSchema);
module.exports = CatchMechanism;
