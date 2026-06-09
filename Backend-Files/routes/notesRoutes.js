const express = require("express");
const {
  uploadFormDetail,
  uploadNotes,
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

module.exports = router;
