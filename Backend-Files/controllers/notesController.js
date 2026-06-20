const cloudinary = require("../config/cloudinary");
const Notes      = require("../models/notes");

// ── helper: does this user have access to a private note? ──────────────────
function hasAccess(note, userId) {
  if (note.visibility !== "private") return true;
  if (!userId) return false;
  if (String(note.userId._id || note.userId) === String(userId)) return true;
  return note.allowedUsers.some((id) => String(id) === String(userId));
}

// Upload notes file info
const uploadNotes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const noteId = req.body.noteId;
    if (!noteId) {
      return res.status(400).json({
        success: false,
        message: "Note id is required before uploading files",
      });
    }

    const processedFiles = req.files.map((file) => {
      const publicId = file.public_id || file.filename;
      const fileUrl  = file.secure_url || file.url || file.path || null;

      return {
        originalName: file.originalname,
        storedName:   file.filename,
        fileType:     file.mimetype,
        fileSize:     file.size || file.bytes || 0,
        filePath:     file.path || undefined,
        fileUrl:      fileUrl   || undefined,
        publicId,
        resourceType: "image",
      };
    });

    const note = await Notes.findOneAndUpdate(
      { _id: noteId, userId: req.user.userId },
      { $push: { files: { $each: processedFiles } } },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found for this user" });
    }

    res.json({
      success:    true,
      message:    "File Uploaded!",
      filesCount: processedFiles.length,
      files: processedFiles.map((f) => ({ fileName: f.originalName, fileSize: f.fileSize })),
    });
  } catch (err) {
    console.error("uploadNotes error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Upload form details
const uploadFormDetail = async (req, res) => {
  try {
    const {
      noteTitle, branch, subject, semester,
      university, course, description, tags,
      visibility, // FIX: accept visibility at creation time
    } = req.body;

    if (!noteTitle || !branch || !subject || !semester ||
        !university || !course || !description) {
      return res.status(400).json({ success: false, message: "Please fill all details" });
    }

    const newNotes = new Notes({
      userId:      req.user.userId,
      title:       noteTitle,
      branch, subject, semester, university, course, description,
      tags:        parseTags(tags),
      visibility:  visibility === "private" ? "private" : "public",
    });

    await newNotes.save();

    res.json({ success: true, message: "Note added to DB", notesDetail: newNotes });
  } catch (err) {
    console.error("uploadFormDetail error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// FIX: getAllNotes now excludes private notes the requesting user
// can't see. Public notes always show. Private notes only show if the
// logged-in user is the owner or is in allowedUsers.
const getAllNotes = async (req, res) => {
  try {
    const { q } = req.query;
    const query  = {};

    if (q) {
      query.$or = [
        { title:      { $regex: q, $options: "i" } },
        { subject:    { $regex: q, $options: "i" } },
        { branch:     { $regex: q, $options: "i" } },
        { university: { $regex: q, $options: "i" } },
        { course:     { $regex: q, $options: "i" } },
        { tags:       { $regex: q, $options: "i" } },
      ];
    }

    const notes = await Notes.find(query)
      .populate("userId", "firstName lastName fullName university")
      .sort({ uploadAt: -1 });

    const currentUserId = req.user?.userId;

    // FIX: never remove private notes from the list — instead mark
    // each one as locked or unlocked based on whether the current
    // viewer has access. Removing them entirely was the bug: Account B
    // never saw Account A's private notes at all, and a subtle access
    // check failure could even hide the owner's own notes from them.
    const notesWithFlag = notes.map((note) => {
      const obj = note.toObject();

      const isOwner = currentUserId && String(note.userId?._id) === String(currentUserId);
      const isAllowed = currentUserId && note.allowedUsers.some(
        (id) => String(id) === String(currentUserId)
      );

      if (note.visibility === "private" && !isOwner && !isAllowed) {
        obj.isLocked = true;
        // Strip sensitive fields from locked notes so the frontend
        // can't accidentally render files/description for someone
        // without access, even if it forgets to check isLocked
        obj.files = [];
        obj.description = undefined;
        obj.tags = [];
      } else {
        obj.isLocked = false;
      }

      return obj;
    });

    res.json({ success: true, notes: notesWithFlag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// FIX: private notes now return a locked preview (title, subject, owner)
// instead of full data + files, unless the requester has access
const getNoteById = async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id).populate(
      "userId", "firstName lastName fullName university"
    );

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const currentUserId = req.user?.userId;

    // DEBUG: trace exactly what we're comparing for access decisions
    console.log("[DEBUG] getNoteById -- currentUserId:", currentUserId);
    console.log("[DEBUG] getNoteById -- note.userId._id:", note.userId?._id?.toString());
    console.log("[DEBUG] getNoteById -- note.visibility:", note.visibility);
    console.log("[DEBUG] getNoteById -- hasAccess result:", hasAccess(note, currentUserId));

    if (note.visibility === "private" && !hasAccess(note, currentUserId)) {
      return res.json({
        success: true,
        note: {
          _id:        note._id,
          title:      note.title,
          subject:    note.subject,
          branch:     note.branch,
          university: note.university,
          userId:     note.userId,
          visibility: "private",
          isLocked:   true,
        },
      });
    }

    const noteObj = note.toObject();
    noteObj.isLocked = false;
    res.json({ success: true, note: noteObj });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid note id" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const viewNoteFile     = (req, res) => serveNoteFile(req, res, false);
const downloadNoteFile = (req, res) => serveNoteFile(req, res, true);

const getUserNotes = async (req, res) => {
  try {
    const notes = await Notes.find({ userId: req.user.userId })
      .populate("userId", "firstName lastName fullName university")
      .sort({ uploadAt: -1 });

    res.json({ success: true, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

function parseTags(tags) {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

// FIX: serveNoteFile now blocks view/download for private notes
// unless the requester is the owner or in allowedUsers
async function serveNoteFile(req, res, shouldDownload) {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const currentUserId = req.user?.userId;

    if (note.visibility === "private" && !hasAccess(note, currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "This note is private. Request access from the owner first.",
      });
    }

    const file = note.files.id(req.params.fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    if (shouldDownload) {
      note.downloads += 1;
      await note.save();
    }

    if (file.fileUrl) {
      if (shouldDownload) {
        const downloadUrl = buildTransformedUrl(file.fileUrl, "fl_attachment");
        return res.redirect(downloadUrl);
      }
      return res.redirect(file.fileUrl);
    }

    if (file.publicId) {
      const resourceType = file.resourceType || "image";
      const flag = shouldDownload ? "attachment" : "inline";
      const url = cloudinary.url(file.publicId, {
        resource_type: resourceType,
        flags: flag,
        format: "pdf",
        secure: true,
      });
      return res.redirect(url);
    }

    return res.status(404).json({ success: false, message: "File URL not available" });
  } catch (error) {
    console.error("serveNoteFile error:", error);
    return res.status(500).json({ success: false, message: "Unable to open file" });
  }
}

function buildTransformedUrl(originalUrl, flag) {
  const parts = originalUrl.split("/upload/");
  if (parts.length !== 2) return originalUrl;
  return `${parts[0]}/upload/${flag}/${parts[1]}`;
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