// ─── Auth helpers ─────────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/signin";
}

function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.toggle("show");
}

// ─── Session verify on page load ──────────────────────────────────────────────
window.onload = function () {
  const profileName = document.getElementById("profile-fullname");
  const profileUniv = document.getElementById("profile-universityName");
  const token       = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/signin";
    return;
  }

  fetch("/api/verify-session", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        localStorage.removeItem("token");
        window.location.href = "/signin";
        return;
      }
      if (profileName) profileName.innerText = data.user.firstName;
      if (profileUniv)  profileUniv.innerText  = data.user.university;
    })
    .catch(() => {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    });
};

// Close dropdown when clicking outside
document.addEventListener("click", function (event) {
  const dropdown   = document.getElementById("profileDropdown");
  const profileBtn = document.querySelector(".profile-btn");
  if (dropdown && profileBtn && !profileBtn.contains(event.target)) {
    dropdown.classList.remove("show");
  }
});

// ─── Main logic after DOM is ready ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {

  // Search bar
  const navSearch = document.getElementById("navSearchInput");
  if (navSearch) {
    navSearch.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && this.value.trim()) {
        window.location.href = "/Search?q=" + encodeURIComponent(this.value.trim());
      }
    });
  }

  const uploadElement        = document.getElementById("uploadArea");
  const uploadBtn            = document.getElementById("upload-Btn");
  const resetBtn             = document.getElementById("reset-Btn");
  const uploadForm           = document.getElementById("uploadForm");
  const filePreviewContainer = document.getElementById("filePreviewContainer");
  const filesGrid            = document.getElementById("filesGrid");
  const filesList            = document.getElementById("uploadedFilesList");
  const uploadResults        = document.getElementById("uploadResults");

  // ── Dropzone setup ──────────────────────────────────────────────────────────
  const myDropzone = new Dropzone("#uploadArea", {
    url: "/api/upload-notes",
    dictDefaultMessage: "Click here or drag PDF files to upload",
    maxFilesize: 5,
    acceptedFiles: ".pdf",
    maxFiles: 5,
    addRemoveLinks: true,
    autoProcessQueue: false,
    parallelUploads: 5,
    previewTemplate: '<div style="display:none;"></div>',
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    // DEBUG: Temporarily removed strict MIME check — only checking extension
    // so we can confirm whether MIME type mismatch was blocking uploads
    accept: function (file, done) {
      console.log("[DEBUG] File added to Dropzone:", file.name);
      console.log("[DEBUG] File MIME type:", file.type);
      console.log("[DEBUG] File size:", file.size);

      const isDuplicate = this.files.some(
        (f) => f !== file && f.name === file.name
      );

      if (isDuplicate) {
        console.warn("[DEBUG] Rejected — duplicate filename:", file.name);
        done("This file has already been added.");
        return;
      }

      const hasValidExt = file.name.toLowerCase().endsWith(".pdf");
      if (!hasValidExt) {
        console.warn("[DEBUG] Rejected — not a PDF extension:", file.name);
        done("Only PDF files are allowed.");
        return;
      }

      console.log("[DEBUG] File accepted:", file.name);
      done();
    },
  });

  console.log("[DEBUG] Dropzone initialized on #uploadArea");

  if (!uploadElement.querySelector(".dz-message")) {
    uploadElement.innerHTML = `
      <div class="upload-icon">PDF</div>
      <h3>Drag & Drop your PDF files here</h3>
      <p>or click to browse</p>
      <p class="upload-info">Maximum file size: 5MB | Supported formats: PDF only</p>
    `;
  }

  // ── Dropzone events ─────────────────────────────────────────────────────────
  myDropzone.on("addedfile", function (file) {
    console.log("[DEBUG] addedfile event fired:", file.name, "| status:", file.status);
    filesGrid.insertAdjacentHTML("beforeend", createFileCard(file));
    filePreviewContainer.style.display = "block";
    uploadBtn.disabled = false;

    const fileCard  = findFileCard(file.name);
    const removeBtn = fileCard?.querySelector(".file-remove-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => myDropzone.removeFile(file));
    }
  });

  myDropzone.on("removedfile", function (file) {
    console.log("[DEBUG] removedfile event fired:", file.name);
    const card = findFileCard(file.name);
    if (card) card.remove();
    if (myDropzone.files.length === 0) {
      filePreviewContainer.style.display = "none";
      uploadBtn.disabled = true;
    }
  });

  myDropzone.on("sending", function (file, xhr, formData) {
    console.log("[DEBUG] sending event fired for:", file.name);
    console.log("[DEBUG] Request URL:", xhr.responseURL || myDropzone.options.url);
  });

  myDropzone.on("success", function (file, response) {
    console.log("[DEBUG] success event fired:", file.name);
    console.log("[DEBUG] Server response:", response);
    addUploadResult(`${file.name} - Uploaded successfully`, "success");
  });

  myDropzone.on("error", function (file, errorMessage, xhr) {
    console.error("[DEBUG] error event fired:", file.name);
    console.error("[DEBUG] Error message:", errorMessage);
    console.error("[DEBUG] XHR status:", xhr ? xhr.status : "no xhr");
    console.error("[DEBUG] XHR response:", xhr ? xhr.responseText : "no xhr");

    const message =
      typeof errorMessage === "string"
        ? errorMessage
        : errorMessage.message || "Upload failed";
    addUploadResult(`${file.name} - ${message}`, "error");
  });

  myDropzone.on("queuecomplete", function () {
    console.log("[DEBUG] queuecomplete event fired");
    console.log("[DEBUG] All files status:", myDropzone.files.map(f => ({
      name: f.name,
      status: f.status
    })));

    const failedFiles = myDropzone.files.filter(
      (f) => f.status === Dropzone.ERROR
    );

    uploadBtn.disabled    = false;
    uploadBtn.textContent = "📤 Upload Notes";

    if (failedFiles.length > 0) {
      console.warn("[DEBUG] Some files failed:", failedFiles.map(f => f.name));
      toast("Failed!", "Some files could not be uploaded", "!");
      return;
    }

    toast("Success!", "Your notes and files were uploaded", "OK");
    uploadForm.reset();
    myDropzone.removeAllFiles(true);
    filesGrid.innerHTML = "";
    filePreviewContainer.style.display = "none";
    uploadBtn.disabled = true;
  });

  myDropzone.on("processing", function (file) {
    console.log("[DEBUG] processing event fired — Dropzone is now uploading:", file.name);
  });

  myDropzone.on("uploadprogress", function (file, progress) {
    console.log(`[DEBUG] uploadprogress: ${file.name} — ${progress.toFixed(0)}%`);
  });

  // ── Reset button ────────────────────────────────────────────────────────────
  resetBtn.addEventListener("click", () => {
    console.log("[DEBUG] Reset button clicked");
    uploadForm.reset();
    myDropzone.removeAllFiles(true);
    uploadBtn.disabled          = true;
    filesList.innerHTML         = "";
    filesGrid.innerHTML         = "";
    uploadResults.style.display = "none";
    filePreviewContainer.style.display = "none";
  });

  // ── Form submit ─────────────────────────────────────────────────────────────
  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("[DEBUG] Form submit triggered");

    if (myDropzone.files.length === 0) {
      console.warn("[DEBUG] No files in Dropzone queue — aborting");
      toast("Failed!", "Please select at least one PDF file", "!");
      return;
    }

    console.log("[DEBUG] Files in Dropzone at submit time:", myDropzone.files.map(f => ({
      name: f.name,
      status: f.status,
      accepted: f.accepted,
      type: f.type,
    })));

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/signin";
      return;
    }

    const formData   = new FormData(uploadForm);
    const formObject = {};
    formData.forEach((value, key) => { formObject[key] = value; });

    console.log("[DEBUG] Form data being sent to /api/upload-form:", formObject);

    uploadBtn.disabled    = true;
    uploadBtn.textContent = "Uploading...";
    filesList.innerHTML   = "";
    uploadResults.style.display = "none";

    // STEP 1 — save note metadata, get noteId back
    fetch("/api/upload-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(formObject),
    })
      .then((res) => {
        console.log("[DEBUG] /api/upload-form response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("[DEBUG] /api/upload-form response body:", data);

        if (!data.success) {
          uploadBtn.disabled    = false;
          uploadBtn.textContent = "📤 Upload Notes";
          toast("Failed!", data.message || "Note details upload failed", "!");
          return;
        }

        const noteId = data.notesDetail._id;
        console.log("[DEBUG] noteId received:", noteId);

        // Check queue state before attaching listener
        console.log("[DEBUG] Files in queue before processQueue():", myDropzone.files.length);
        console.log("[DEBUG] File statuses:", myDropzone.files.map(f => ({
          name: f.name,
          status: f.status,
          accepted: f.accepted,
        })));

        // STEP 2 — attach sending listener with noteId BEFORE processQueue()
        myDropzone.off("sending");

        myDropzone.on("sending", function (file, xhr, fd) {
          console.log("[DEBUG] sending event — appending noteId:", noteId, "to file:", file.name);
          fd.append("noteId", noteId);
        });

        myDropzone.options.headers = {
          Authorization: `Bearer ${token}`,
        };

        console.log("[DEBUG] Calling processQueue() now...");

        // STEP 3 — trigger actual file uploads to /api/upload-notes
        myDropzone.processQueue();

        console.log("[DEBUG] processQueue() called — waiting for uploads...");
      })
      .catch((err) => {
        console.error("[DEBUG] fetch /api/upload-form threw an error:", err);
        uploadBtn.disabled    = false;
        uploadBtn.textContent = "📤 Upload Notes";
        toast("Failed!", "An error occurred while uploading", "!");
      });
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(type, message, sign) {
  const toastContainer = document.querySelector(".toast-container");
  const toastSign      = document.querySelector("#toast-mark");
  const toastType      = document.querySelector("#toast-type");
  const toastDesc      = document.querySelector("#toast-des");

  if (!toastContainer || !toastSign || !toastType || !toastDesc) {
    console.warn("[DEBUG] Toast elements not found in DOM. Check upload.html.");
    return;
  }

  console.log("[DEBUG] Toast fired — type:", type, "| message:", message);

  toastContainer.classList.remove("show");
  void toastContainer.offsetWidth;
  toastContainer.classList.add("show");

  toastContainer.style.backgroundColor =
    type === "Failed!" ? "red" : "rgb(25, 160, 25)";
  toastSign.innerText = sign;
  toastType.innerText = type;
  toastDesc.innerText = message;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addUploadResult(message, type) {
  const filesList     = document.getElementById("uploadedFilesList");
  const uploadResults = document.getElementById("uploadResults");
  const listItem      = document.createElement("li");
  listItem.textContent = message;
  if (type === "error") listItem.style.color = "red";
  filesList.appendChild(listItem);
  uploadResults.style.display = "block";
}

function formatFileSize(bytes) {
  if (bytes < 1024)    return `${bytes} bytes`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function createFileCard(file) {
  const fileName = escapeHtml(file.name);
  const fileSize = formatFileSize(file.size);
  return `
    <div class="file-card" data-file-name="${fileName}">
      <div class="file-icon">PDF</div>
      <div class="file-info">
        <div class="file-name">${fileName}</div>
        <div class="file-size">${fileSize}</div>
        <div class="file-status ready">Ready to upload</div>
      </div>
      <div class="file-actions">
        <button type="button" class="file-remove-btn">Remove</button>
      </div>
    </div>
  `;
}

function findFileCard(fileName) {
  return [...document.querySelectorAll(".file-card")].find(
    (card) => card.dataset.fileName === fileName
  );
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}