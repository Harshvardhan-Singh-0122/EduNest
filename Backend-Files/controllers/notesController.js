const path = require("path");
const Notes = require("../models/notes");

// Upload notes file info
const uploadNotes = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }

  const { noteId } = req.body;

  if (!noteId) {
    return res.status(400).json({
      success: false,
      message: "Note id is required before uploading files",
    });
  }

  const processedFiles = req.files.map((file) => ({
    originalName: file.originalname,
    storedName: file.filename,
    fileType: file.mimetype,
    fileSize: file.size,
    filePath: file.path,
  }));

  const note = await Notes.findOneAndUpdate(
    { _id: noteId, userId: req.user.userId },
    { $push: { files: { $each: processedFiles } } },
    { new: true }
  );

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found for this user",
    });
  }

  res.json({
    success: true,
    message: "File Uploaded!",
    filesCount: processedFiles.length,
    files: processedFiles.map((file) => ({
      fileName: file.originalName,
      fileSize: file.fileSize,
    })),
  });
};

// Upload form details
const uploadFormDetail = async (req, res) => {
  const {
    noteTitle,
    branch,
    subject,
    semester,
    university,
    course,
    description,
    tags,
  } = req.body;

  if (
    !noteTitle ||
    !branch ||
    !subject ||
    !semester ||
    !university ||
    !course ||
    !description
  ) {
    return res.json({ success: false, message: "Please fill all details" });
  }

  const newNotes = new Notes({
    userId: req.user.userId,
    title: noteTitle,
    branch,
    subject,
    semester,
    university,
    course,
    description,
    tags: parseTags(tags),
  });

  await newNotes.save();

  res.json({
    success: true,
    message: "Note added to DB",
    notesDetail: newNotes,
  });
};

const getAllNotes = async (req, res) => {
  try {
    const { q } = req.query;
    const query = {};

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { branch: { $regex: q, $options: "i" } },
        { university: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    const notes = await Notes.find(query)
      .populate("userId", "firstName lastName fullName university")
      .sort({ uploadAt: -1 });

    res.json({ success: true, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id).populate(
      "userId",
      "firstName lastName fullName university"
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    res.json({ success: true, note });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid note id",
    });
  }
};

const viewNoteFile = async (req, res) => {
  serveNoteFile(req, res, false);
};

const downloadNoteFile = async (req, res) => {
  serveNoteFile(req, res, true);
};

// Get notes for logged-in user
const getUserNotes = async (req, res) => {
  try {
    const notes = await Notes.find({ userId: req.user.userId })
      .populate("userId", "firstName lastName fullName university")
      .sort({
        uploadAt: -1,
      });

    res.json({ success: true, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

function parseTags(tags) {
  if (!tags) return [];

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function serveNoteFile(req, res, shouldDownload) {
  try {
    const note = await Notes.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    const file = note.files.id(req.params.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const absolutePath = path.resolve(file.filePath);

    if (shouldDownload) {
      note.downloads += 1;
      await note.save();
      return res.download(absolutePath, file.originalName);
    }

    res.setHeader("Content-Type", file.fileType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.originalName)}"`
    );
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to open file",
    });
  }
}

module.exports = {
  uploadFormDetail,
  uploadNotes,
  getAllNotes,
  getNoteById,
  viewNoteFile,
  downloadNoteFile,
  getUserNotes,
};
