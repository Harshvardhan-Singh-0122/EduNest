const mongoose = require("mongoose");

const accessRequestSchema = new mongoose.Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notes",
      required: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent the same user from spamming duplicate requests for the same note
accessRequestSchema.index({ noteId: 1, requesterId: 1 }, { unique: true });

module.exports = mongoose.model("AccessRequest", accessRequestSchema);