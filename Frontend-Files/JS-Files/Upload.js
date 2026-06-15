// FIX #4: logout() defined at the top so the HTML onclick can always find it
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/signin";
}

function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.toggle("show");
}

window.onload = function () {
  const profileName     = document.getElementById("profile-fullname");
  const profileUniv     = document.getElementById("profile-universityName");
  const token           = localStorage.getItem("token");

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
  const dropdown  = document.getElementById("profileDropdown");
  const profileBtn = document.querySelector(".profile-btn");
  if (dropdown && profileBtn && !profileBtn.contains(event.target)) {
    dropdown.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", function () {

  // FIX #5: Search bar now navigates to the Search page
  const navSearch = document.getElementById("navSearchInput");
  if (navSearch) {
    navSearch.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && this.value.trim()) {
        window.location.href = "/Search?q=" + encodeURIComponent(this.value.trim());
      }
    });
  }

  const uploadElement       = document.getElementById("uploadArea");
  const uploadBtn           = document.getElementById("upload-Btn");
  const resetBtn            = document.getElementById("reset-Btn");
  const uploadForm          = document.getElementById("uploadForm");
  const filePreviewContainer = document.getElementById("filePreviewContainer");
  const filesGrid           = document.getElementById("filesGrid");
  const filesList           = document.getElementById("uploadedFilesList");
  const uploadResults       = document.getElementById("uploadResults");

  const myDropzone = new Dropzone("#uploadArea", {
    url: "/api/upload-notes",
    dictDefaultMessage: "Click here or drag PDF files to upload",
    maxFilesize: 5,
    acceptedFiles: ".pdf",
    maxFiles: 5,
    addRemoveLinks: true,
    autoProcessQueue: false,
    previewTemplate: '<div style="display:none;"></div>',
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    // Prevents duplicate filenames and verifies real PDF MIME type
    accept: function (file, done) {
      const isDuplicate = this.files.some(
        (f) => f !== file && f.name === file.name
      );
      if (isDuplicate) {
        done("This file has already been added.");
      } else if (file.type !== "application/pdf") {
        done("Only real PDF files are allowed.");
      } else {
        done();
      }
    },
  });

  if (!uploadElement.querySelector(".dz-message")) {
    uploadElement.innerHTML = `
      <div class="upload-icon">PDF</div>
      <h3>Drag & Drop your PDF files here</h3>
      <p>or click to browse</p>
      <p class="upload-info">Maximum file size: 5MB | Supported formats: PDF only</p>
    `;
  }

  myDropzone.on("addedfile", function (file) {
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
    const card = findFileCard(file.name);
    if (card) card.remove();

    if (myDropzone.files.length === 0) {
      filePreviewContainer.style.display = "none";
      uploadBtn.disabled = true;
    }
  });

  myDropzone.on("success", function (file) {
    addUploadResult(`${file.name} - Uploaded successfully`, "success");
  });

  myDropzone.on("error", function (file, errorMessage) {
    const message =
      typeof errorMessage === "string"
        ? errorMessage
        : errorMessage.message || "Upload failed";
    addUploadResult(`${file.name} - ${message}`, "error");
  });

  myDropzone.on("queuecomplete", function () {
    const failedFiles = myDropzone.files.filter(
      (f) => f.status === Dropzone.ERROR
    );

    uploadBtn.disabled = false;
    uploadBtn.textContent = "📤 Upload Notes";

    if (failedFiles.length > 0) {
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

  resetBtn.addEventListener("click", () => {
    uploadForm.reset();
    myDropzone.removeAllFiles(true);
    uploadBtn.disabled = true;
    filesList.innerHTML = "";
    filesGrid.innerHTML = "";
    uploadResults.style.display = "none";
    filePreviewContainer.style.display = "none";
  });

  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (myDropzone.files.length === 0) {
      toast("Failed!", "Please select at least one PDF file", "!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/signin";
      return;
    }

    const formData   = new FormData(uploadForm);
    const formObject = {};
    formData.forEach((value, key) => { formObject[key] = value; });

    uploadBtn.disabled    = true;
    uploadBtn.textContent = "Uploading...";
    filesList.innerHTML   = "";
    uploadResults.style.display = "none";

    fetch("/api/upload-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formObject),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          uploadBtn.disabled    = false;
          uploadBtn.textContent = "📤 Upload Notes";
          toast("Failed!", data.message || "Note details upload failed", "!");
          return;
        }

        myDropzone.options.headers = { Authorization: `Bearer ${token}` };

        // Store noteId in a variable — avoids referencing a nested chain
        // inside the sending callback
        const noteId = data.notesDetail._id;

        myDropzone.removeAllListeners("sending");
        myDropzone.on("sending", function (file, xhr, fd) {
          fd.append("noteId", noteId);
        });

        myDropzone.processQueue();
      })
      .catch(() => {
        uploadBtn.disabled    = false;
        uploadBtn.textContent = "📤 Upload Notes";
        toast("Failed!", "An error occurred while uploading", "!");
      });
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────
// FIX #1: querySelector uses the stable class "toast-container" — NOT ".hidden"
// ".hidden" was removed from the element after the first toast call, so
// every subsequent call returned null and crashed. "toast-container" never
// changes, so it always resolves correctly no matter how many times toast fires.
function toast(type, message, sign) {
  const toastContainer  = document.querySelector(".toast-container");
  const toastSign       = document.querySelector("#toast-mark");
  const toastType       = document.querySelector("#toast-type");
  const toastDesc       = document.querySelector("#toast-des");

  if (!toastContainer || !toastSign || !toastType || !toastDesc) {
    console.warn("Toast elements not found in DOM. Check upload.html structure.");
    return;
  }

  toastContainer.classList.remove("show");
  void toastContainer.offsetWidth; // force reflow so animation restarts
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