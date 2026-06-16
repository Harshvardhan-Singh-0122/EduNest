const multer  = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "edunest/notes",

    // FIX: Changed from "raw" to "image" with page format.
    // Cloudinary cannot serve PDFs as viewable/embeddable files
    // when resource_type is "raw" — it serves them as binary blobs
    // with Content-Type: application/octet-stream, which browsers
    // cannot render inline.
    //
    // resource_type: "image" with format: "pdf" tells Cloudinary to:
    // 1. Store the file as a proper PDF asset
    // 2. Serve it with Content-Type: application/pdf
    // 3. Allow inline viewing in <iframe> and <embed> tags
    // 4. Enable Cloudinary's PDF viewer and page transformations
    resource_type: "image",
    format: "pdf",

    public_id: (req, file) => {
      const safeName = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-");
      return `${Date.now()}-${safeName}`;
    },
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;