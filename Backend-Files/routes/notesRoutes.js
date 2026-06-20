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

const {
  setVisibility,
  preApproveUser,
  requestAccess,
  getMyAccessRequests,
  approveRequest,
  denyRequest,
  getNotifications,
  markNotificationRead,
} = require("../controllers/accessController");

const upload        = require("../middlewares/multerMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const optionalAuth   = require("../middlewares/optionalAuthMiddleware");

const router = express.Router();

// ── Upload (always requires auth) ──────────────────────────────────────────
router.post("/upload-form", authMiddleware, uploadFormDetail);

router.post("/upload-notes", authMiddleware, (req, res, next) => {
  upload.array("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, message: error.message || "File upload failed" });
    }
    next();
  });
}, uploadNotes);

// ── User's own notes ────────────────────────────────────────────────────────
router.get("/notes/my", authMiddleware, getUserNotes);

// ── Public browse routes — now use optionalAuth so private notes can be
//    filtered correctly for the requesting user if they're logged in ───────
router.get("/notes", optionalAuth, getAllNotes);
router.get("/notes/:id", optionalAuth, getNoteById);
router.get("/notes/:id/files/:fileId/view",     optionalAuth, viewNoteFile);
router.get("/notes/:id/files/:fileId/download", optionalAuth, downloadNoteFile);

// ── Privacy controls (owner only) ───────────────────────────────────────────
router.patch("/notes/:id/visibility",   authMiddleware, setVisibility);
router.post("/notes/:id/pre-approve",   authMiddleware, preApproveUser);

// ── Access requests ──────────────────────────────────────────────────────────
router.post("/notes/:id/request-access",        authMiddleware, requestAccess);
router.get("/access-requests/mine",              authMiddleware, getMyAccessRequests);
router.post("/access-requests/:requestId/approve", authMiddleware, approveRequest);
router.post("/access-requests/:requestId/deny",     authMiddleware, denyRequest);

// ── Notifications ────────────────────────────────────────────────────────────
router.get("/notifications",            authMiddleware, getNotifications);
router.patch("/notifications/:id/read", authMiddleware, markNotificationRead);

module.exports = router;