const noteId = window.location.pathname.split("/").filter(Boolean).pop();

const elements = {
  title: document.getElementById("noteTitle"),
  description: document.getElementById("noteDescription"),
  subject: document.getElementById("noteSubject"),
  branch: document.getElementById("noteBranch"),
  semester: document.getElementById("noteSemester"),
  course: document.getElementById("noteCourse"),
  university: document.getElementById("noteUniversity"),
  uploaded: document.getElementById("noteUploaded"),
  contributor: document.getElementById("noteContributor"),
  tagList: document.getElementById("tagList"),
  fileList: document.getElementById("fileList"),
  pdfViewer: document.getElementById("pdfViewer"),
  emptyPreview: document.getElementById("emptyPreview"),
  selectedFileName: document.getElementById("selectedFileName"),
  downloadBtn: document.getElementById("downloadBtn"),
};

fetch(`/api/notes/${noteId}`)
  .then((response) => response.json())
  .then((data) => {
    if (!data.success) {
      renderError(data.message || "Unable to load note");
      return;
    }

    renderNote(data.note);
  })
  .catch(() => {
    renderError("Unable to load note");
  });

function renderNote(note) {
  document.title = `${note.title} - EduNest`;
  elements.title.textContent = note.title;
  elements.description.textContent = note.description;
  elements.subject.textContent = note.subject;
  elements.branch.textContent = note.branch;
  elements.semester.textContent = note.semester;
  elements.course.textContent = note.course;
  elements.university.textContent = note.university;
  elements.uploaded.textContent = new Date(note.uploadAt).toLocaleDateString();
  elements.contributor.textContent = getContributorName(note.userId);

  elements.tagList.innerHTML = "";
  if (note.tags && note.tags.length > 0) {
    note.tags.forEach((tag) => {
      const tagItem = document.createElement("span");
      tagItem.className = "tag";
      tagItem.textContent = tag;
      elements.tagList.appendChild(tagItem);
    });
  }

  renderFiles(note);
}

function renderFiles(note) {
  elements.fileList.innerHTML = "";

  if (!note.files || note.files.length === 0) {
    elements.fileList.innerHTML = `<p class="error">No PDF file is attached to this note yet.</p>`;
    elements.downloadBtn.style.display = "none";
    return;
  }

  note.files.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.dataset.fileId = file._id;
    fileItem.innerHTML = `
      <span class="file-name">${escapeHtml(file.originalName)}</span>
      <span class="file-size">${formatFileSize(file.fileSize)}</span>
      <div class="file-actions">
        <button class="btn btn-secondary" type="button">Preview</button>
        <a class="btn btn-primary" href="/api/notes/${note._id}/files/${file._id}/download">Download</a>
      </div>
    `;

    fileItem.querySelector("button").addEventListener("click", () => {
      selectFile(note._id, file);
    });

    elements.fileList.appendChild(fileItem);

    if (index === 0) {
      selectFile(note._id, file);
    }
  });
}

function selectFile(currentNoteId, file) {
  document.querySelectorAll(".file-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.fileId === file._id);
  });

  const viewUrl = `/api/notes/${currentNoteId}/files/${file._id}/view`;
  const downloadUrl = `/api/notes/${currentNoteId}/files/${file._id}/download`;

  elements.selectedFileName.textContent = file.originalName;
  elements.downloadBtn.href = downloadUrl;
  elements.downloadBtn.style.display = "inline-flex";
  elements.pdfViewer.src = viewUrl;
  elements.pdfViewer.style.display = "block";
  elements.emptyPreview.style.display = "none";
}

function getContributorName(user) {
  if (!user) return "EduNest user";
  return user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "EduNest user";
}

function renderError(message) {
  document.querySelector(".note-layout").innerHTML = `<div class="error">${message}</div>`;
}

function formatFileSize(bytes) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
