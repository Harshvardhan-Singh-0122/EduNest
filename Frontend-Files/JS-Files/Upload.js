function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.toggle("show");
}

window.onload = function () {
  const profileName = document.getElementById("profile-fullname");
  const profileUniversity = document.getElementById("profile-universityName");
  const userProfileName = document.getElementById("user-profileName");
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/signin";
    return;
  }

  fetch("/api/verify-session", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        localStorage.removeItem("token");
        window.location.href = "/signin";
        return;
      }

      const firstName = data.user.firstName;
      const university = data.user.university;

      if (profileName) profileName.innerText = firstName;
      if (profileUniversity) profileUniversity.innerText = university;
      if (userProfileName) userProfileName.innerText = firstName;
    })
    .catch(() => {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    });
};

document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("profileDropdown");
  const profileBtn = document.querySelector(".profile-btn");

  if (dropdown && profileBtn && !profileBtn.contains(event.target)) {
    dropdown.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const uploadElement = document.getElementById("uploadArea");
  const uploadBtn = document.getElementById("upload-Btn");
  const resetBtn = document.getElementById("reset-Btn");
  const uploadForm = document.getElementById("uploadForm");
  const filePreviewContainer = document.getElementById("filePreviewContainer");
  const filesGrid = document.getElementById("filesGrid");
  const filesList = document.getElementById("uploadedFilesList");
  const uploadResults = document.getElementById("uploadResults");

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

    const fileCard = findFileCard(file.name);
    const removeBtn = fileCard?.querySelector(".file-remove-btn");

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        myDropzone.removeFile(file);
      });
    }
  });

  myDropzone.on("removedfile", function (file) {
    const removeFileCard = findFileCard(file.name);

    if (removeFileCard) {
      removeFileCard.remove();
    }

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
      (file) => file.status === Dropzone.ERROR
    );

    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload Notes";

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

    const formData = new FormData(uploadForm);
    const formObject = {};

    formData.forEach((value, key) => {
      formObject[key] = value;
    });

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";
    filesList.innerHTML = "";
    uploadResults.style.display = "none";

    fetch("/api/upload-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formObject),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          uploadBtn.disabled = false;
          uploadBtn.textContent = "Upload Notes";
          toast("Failed!", data.message || "Note details upload failed", "!");
          return;
        }

        myDropzone.options.headers = {
          Authorization: `Bearer ${token}`,
        };

        // Ensure noteId is included inside multipart/form-data that multer reads on backend
        myDropzone.removeAllListeners("sending");
        myDropzone.on("sending", function (file, xhr, formData) {
          formData.append("noteId", data.notesDetail._id);
        });

        myDropzone.processQueue();
      })
      .catch(() => {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload Notes";
        toast("Failed!", "An error occurred while uploading", "!");
      });
  });
});

const toastContainer = document.querySelector(".hidden");
const toastSign = document.querySelector("#toast-mark");
const toastType = document.querySelector("#toast-type");
const toastDescription = document.querySelector("#toast-des");

function toast(type, message, sign) {
  toastContainer.classList.remove("hidden");
  toastContainer.classList.remove("show");
  void toastContainer.offsetWidth;
  toastContainer.classList.add("show");
  toastContainer.style.backgroundColor = type === "Failed!" ? "red" : "rgb(25, 160, 25)";
  toastSign.innerText = sign;
  toastType.innerText = type;
  toastDescription.innerText = message;
}

function addUploadResult(message, type) {
  const filesList = document.getElementById("uploadedFilesList");
  const uploadResults = document.getElementById("uploadResults");
  const listItem = document.createElement("li");

  listItem.textContent = message;
  if (type === "error") {
    listItem.style.color = "red";
  }

  filesList.appendChild(listItem);
  uploadResults.style.display = "block";
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

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
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
