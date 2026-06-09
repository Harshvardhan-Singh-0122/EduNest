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
  tags: [{ type: String }],
  files: [
    {
      originalName: { type: String, required: true },
      storedName: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
      filePath: { type: String },
      fileUrl: { type: String },
      publicId: { type: String },
      resourceType: { type: String, default: "raw" },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  downloads: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  uploadAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notes", notesSchema);
