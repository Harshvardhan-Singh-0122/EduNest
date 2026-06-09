const express = require("express");
const {
  uploadFormDetail,
  uploadNotes,
  getAllNotes,
  getNoteById,
  viewNoteFile,
  downloadNoteFile,
  getUserNotes,
} = require("../controllers/notesController");
const upload = require("../middlewares/multerMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Protected route: upload form details
router.post("/upload-form", authMiddleware, uploadFormDetail);

// Protected route: upload notes files
router.post("/upload-notes", authMiddleware, (req, res, next) => {
  upload.array("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "File upload failed",
      });
    }

    next();
  });
}, uploadNotes);

// Protected route: get user notes
router.get("/notes/my", authMiddleware, getUserNotes);

// Public routes: browse/open/download notes
router.get("/notes", getAllNotes);
router.get("/notes/:id", getNoteById);
router.get("/notes/:id/files/:fileId/view", viewNoteFile);
router.get("/notes/:id/files/:fileId/download", downloadNoteFile);

module.exports = router;
