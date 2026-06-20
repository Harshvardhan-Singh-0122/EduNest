const AccessRequest = require("../models/accessRequest");
const Notification   = require("../models/notification");
const Notes          = require("../models/notes");
const User           = require("../models/User");

// ─── Owner: toggle a note's visibility ─────────────────────────────────────
const setVisibility = async (req, res) => {
  try {
    const { visibility } = req.body;

    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "visibility must be 'public' or 'private'",
      });
    }

    const note = await Notes.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { visibility },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found or you are not the owner",
      });
    }

    res.json({ success: true, message: "Visibility updated", note });
  } catch (err) {
    console.error("setVisibility error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Owner: pre-approve a specific user without them requesting ───────────
const preApproveUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const note = await Notes.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $addToSet: { allowedUsers: userId } },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found or you are not the owner",
      });
    }

    res.json({ success: true, message: "User pre-approved", note });
  } catch (err) {
    console.error("preApproveUser error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Viewer: request access to a private note ─────────────────────────────
const requestAccess = async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    if (note.visibility !== "private") {
      return res.status(400).json({
        success: false,
        message: "This note is public — no request needed",
      });
    }

    if (String(note.userId) === String(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: "You already own this note",
      });
    }

    if (note.allowedUsers.some((id) => String(id) === String(req.user.userId))) {
      return res.status(400).json({
        success: false,
        message: "You already have access to this note",
      });
    }

    // Prevent duplicate pending requests
    const existing = await AccessRequest.findOne({
      noteId: note._id,
      requesterId: req.user.userId,
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.status(409).json({
          success: false,
          message: "You already have a pending request for this note",
        });
      }
      if (existing.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "You already have access to this note",
        });
      }
      // status was "denied" — allow them to request again by resetting it
      existing.status = "pending";
      await existing.save();
    }

    const accessRequest = existing || (await AccessRequest.create({
      noteId: note._id,
      requesterId: req.user.userId,
      ownerId: note.userId,
    }));

    // FIX: fetch the requester's name so the notification message and
    // the notification bell can show WHO is asking, instead of "Someone"
    const requester = await User.findById(req.user.userId).select(
      "firstName lastName fullName"
    );
    const requesterName =
      requester?.fullName ||
      `${requester?.firstName || ""} ${requester?.lastName || ""}`.trim() ||
      "A user";

    await Notification.create({
      userId: note.userId,
      type: "access_request",
      message: `${requesterName} requested access to your note "${note.title}"`,
      relatedNoteId: note._id,
      relatedRequestId: accessRequest._id,
    });

    res.json({
      success: true,
      message: "Access request sent. The owner will be notified.",
    });
  } catch (err) {
    console.error("requestAccess error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Owner: list pending requests for their notes ──────────────────────────
const getMyAccessRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({
      ownerId: req.user.userId,
      status: "pending",
    })
      .populate("noteId", "title subject")
      .populate("requesterId", "firstName lastName fullName university")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("getMyAccessRequests error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Owner: approve a request ───────────────────────────────────────────────
const approveRequest = async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findOne({
      _id: req.params.requestId,
      ownerId: req.user.userId,
    });

    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found or you are not the owner",
      });
    }

    accessRequest.status = "approved";
    await accessRequest.save();

    await Notes.findByIdAndUpdate(accessRequest.noteId, {
      $addToSet: { allowedUsers: accessRequest.requesterId },
    });

    const note = await Notes.findById(accessRequest.noteId).select("title");

    // FIX: mark the ORIGINAL access_request notification (the one the
    // owner just acted on) as read so it stops showing Approve/Deny
    // buttons on every page reload. Without this, the notification
    // record never reflects that the request was already handled.
    await Notification.updateMany(
      { relatedRequestId: accessRequest._id, type: "access_request" },
      { read: true }
    );

    await Notification.create({
      userId: accessRequest.requesterId,
      type: "access_approved",
      message: `Your request to view "${note?.title || "a note"}" was approved`,
      relatedNoteId: accessRequest.noteId,
      relatedRequestId: accessRequest._id,
    });

    res.json({ success: true, message: "Request approved" });
  } catch (err) {
    console.error("approveRequest error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Owner: deny a request ───────────────────────────────────────────────────
const denyRequest = async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findOne({
      _id: req.params.requestId,
      ownerId: req.user.userId,
    });

    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found or you are not the owner",
      });
    }

    accessRequest.status = "denied";
    await accessRequest.save();

    const note = await Notes.findById(accessRequest.noteId).select("title");

    // FIX: same as approve -- mark the original notification as read
    // so the Approve/Deny buttons don't reappear on reload
    await Notification.updateMany(
      { relatedRequestId: accessRequest._id, type: "access_request" },
      { read: true }
    );

    await Notification.create({
      userId: accessRequest.requesterId,
      type: "access_denied",
      message: `Your request to view "${note?.title || "a note"}" was denied`,
      relatedNoteId: accessRequest.noteId,
      relatedRequestId: accessRequest._id,
    });

    res.json({ success: true, message: "Request denied" });
  } catch (err) {
    console.error("denyRequest error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Logged-in user: get their notifications ───────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user.userId,
      read: false,
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Mark a notification as read ───────────────────────────────────────────
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  setVisibility,
  preApproveUser,
  requestAccess,
  getMyAccessRequests,
  approveRequest,
  denyRequest,
  getNotifications,
  markNotificationRead,
};