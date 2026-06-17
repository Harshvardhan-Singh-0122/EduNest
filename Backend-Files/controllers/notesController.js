const cloudinary = require("../config/cloudinary");
const Notes      = require("../models/notes");

// Upload notes file info
const uploadNotes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const noteId = req.body.noteId;

    if (!noteId) {
      return res.status(400).json({
        success: false,
        message: "Note id is required before uploading files",
      });
    }

    const processedFiles = req.files.map((file) => {
      // DEBUG: log the entire raw file object Multer + Cloudinary gives us
      console.log("[DEBUG] ---- RAW MULTER FILE OBJECT ----");
      console.log(JSON.stringify(file, null, 2));
      console.log("[DEBUG] ---------------------------------");

      const publicId = file.public_id || file.filename;
      const fileUrl  = file.secure_url || file.url || file.path || null;

      return {
        originalName: file.originalname,
        storedName:   file.filename,
        fileType:     file.mimetype,
        fileSize:     file.size || file.bytes || 0,
        filePath:     file.path     || undefined,
        fileUrl:      fileUrl       || undefined,
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
      return res.status(404).json({
        success: false,
        message: "Note not found for this user",
      });
    }

    res.json({
      success:    true,
      message:    "File Uploaded!",
      filesCount: processedFiles.length,
      files: processedFiles.map((f) => ({
        fileName: f.originalName,
        fileSize: f.fileSize,
      })),
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
    } = req.body;

    if (!noteTitle || !branch || !subject || !semester ||
        !university || !course || !description) {
      return res.status(400).json({
        success: false,
        message: "Please fill all details",
      });
    }

    const newNotes = new Notes({
      userId:      req.user.userId,
      title:       noteTitle,
      branch, subject, semester, university, course, description,
      tags:        parseTags(tags),
    });

    await newNotes.save();

    res.json({
      success:     true,
      message:     "Note added to DB",
      notesDetail: newNotes,
    });
  } catch (err) {
    console.error("uploadFormDetail error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllNotes = async (req, res) => {
  try {
    const { q }  = req.query;
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

    res.json({ success: true, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id).populate(
      "userId", "firstName lastName fullName university"
    );

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.json({ success: true, note });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid note id" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const viewNoteFile    = (req, res) => serveNoteFile(req, res, false);
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

// ─── Core fix: build correct Cloudinary URLs for PDF view and download ────────
async function serveNoteFile(req, res, shouldDownload) {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const file = note.files.id(req.params.fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    if (shouldDownload) {
      note.downloads += 1;
      await note.save();
    }

    // DEBUG: log everything about this file so we can see exactly
    // what is stored in MongoDB vs what URL we are about to redirect to
    console.log("[DEBUG] ---- serveNoteFile ----");
    console.log("[DEBUG] shouldDownload:", shouldDownload);
    console.log("[DEBUG] file.fileUrl (raw from DB):", file.fileUrl);
    console.log("[DEBUG] file.publicId:", file.publicId);
    console.log("[DEBUG] file.resourceType:", file.resourceType);
    console.log("[DEBUG] file.originalName:", file.originalName);

    if (file.fileUrl) {
      if (shouldDownload) {
        // fl_attachment works as a standalone flag and forces download
        const downloadUrl = buildTransformedUrl(file.fileUrl, "fl_attachment");
        console.log("[DEBUG] Final redirect URL:", downloadUrl);
        return res.redirect(downloadUrl);
      }

      // FIX: fl_inline is not a valid standalone flag for PDFs and
      // returns 400 Bad Request on its own. PDFs are served inline
      // by Cloudinary by default (no Content-Disposition header at all),
      // so for preview we just redirect to the plain stored URL —
      // no flag needed.
      console.log("[DEBUG] Final redirect URL (plain, no flag):", file.fileUrl);
      return res.redirect(file.fileUrl);
    }

    // Fallback: if fileUrl was not stored (very old records),
    // build URL manually from publicId
    if (file.publicId) {
      const resourceType = file.resourceType || "image";
      const flag         = shouldDownload ? "attachment" : "inline";

      const url = cloudinary.url(file.publicId, {
        resource_type: resourceType,
        flags:         flag,
        format:        "pdf",
        secure:        true,
      });
      return res.redirect(url);
    }

    return res.status(404).json({
      success: false,
      message: "File URL not available",
    });

  } catch (error) {
    console.error("serveNoteFile error:", error);
    return res.status(500).json({ success: false, message: "Unable to open file" });
  }
}

// ─── Helper: insert a Cloudinary transformation flag into an existing URL ─────
// Cloudinary URLs look like:
//   https://res.cloudinary.com/cloud/image/upload/v123456/folder/file.pdf
// We need to insert the flag AFTER "/upload/" so it becomes:
//   https://res.cloudinary.com/cloud/image/upload/fl_inline/v123456/folder/file.pdf
function buildTransformedUrl(originalUrl, flag) {
  // Split on "/upload/" and insert the flag in between
  const parts = originalUrl.split("/upload/");
  if (parts.length !== 2) {
    // URL format unexpected — return original as fallback
    return originalUrl;
  }
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