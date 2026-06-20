const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      // who receives this notification
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["access_request", "access_approved", "access_denied"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notes",
    },
    relatedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessRequest",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);