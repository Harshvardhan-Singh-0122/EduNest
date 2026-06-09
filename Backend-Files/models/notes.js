const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  title: { type: String, required: true },
  branch: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  university: { type: String, required: true },
  course: { type: String, required: true },
  description: { type: String, required: true },
  downloads: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  uploadAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notes", notesSchema);
