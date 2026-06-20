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

// FIX: validate noteId before fetching — if the URL has no real ID
// (e.g. visiting /notes/ directly), don't fire a broken request
if (!noteId || noteId === "notes") {
  renderError("No note ID provided. Go back and select a note.");
} else {
  fetchNote();
}

function fetchNote() {
  // NEW: include the auth token if available so the backend can tell
  // whether this user has access to a private note
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  fetch(`/api/notes/${noteId}`, { headers })
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        renderError(data.message || "Unable to load note");
        return;
      }

      if (data.note.isLocked) {
        renderLockedNote(data.note);
        return;
      }

      renderNote(data.note);
    })
    .catch(() => {
      renderError("Unable to load note");
    });
}

// NEW: shows a locked preview with title/subject/owner and a
// Request Access button, instead of the full note + PDF viewer
function renderLockedNote(note) {
  document.title = `${note.title} - EduNest`;

  const uploaderName = getContributorName(note.userId);

  document.querySelector(".note-layout").innerHTML = `
    <div class="locked-note-detail" style="text-align:center; padding: 3rem 1.5rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
      <h2 style="margin-bottom: 0.5rem;">${escapeHtml(note.title)}</h2>
      <p style="color:#7f8c8d; margin-bottom: 0.25rem;">${escapeHtml(note.subject)} • ${escapeHtml(note.branch)}</p>
      <p style="color:#7f8c8d; margin-bottom: 1.5rem;">Uploaded by ${escapeHtml(uploaderName)}</p>
      <p style="color:#999; max-width: 420px; margin: 0 auto 1.5rem;">
        This note is private. Request access from the owner — you'll be
        notified once they approve or deny it.
      </p>
      <button class="btn btn-primary" id="requestAccessBtn" style="padding: 0.7rem 1.6rem;">
        🔒 Request Access
      </button>
    </div>
  `;

  document.getElementById("requestAccessBtn").addEventListener("click", function () {
    requestAccess(note._id, this);
  });
}

function requestAccess(noteId, btnEl) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/signin";
    return;
  }

  btnEl.disabled = true;
  btnEl.textContent = "Sending request...";

  fetch(`/api/notes/${noteId}/request-access`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        btnEl.textContent = "✓ Request sent — you'll be notified";
        btnEl.style.background = "#2ecc71";
      } else {
        btnEl.disabled = false;
        btnEl.textContent = data.message || "Request failed — try again";
      }
    })
    .catch(() => {
      btnEl.disabled = false;
      btnEl.textContent = "Request failed — try again";
    });
}

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

  // FIX: append the auth token as a query param on the download link.
  // <a href> navigation never sends the Authorization header, so without
  // this, private-note downloads always arrive at the server with no
  // auth info and get rejected with 403 -- even for the note's own owner.
  const token = localStorage.getItem("token");
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

  note.files.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.dataset.fileId = file._id;
    fileItem.innerHTML = `
      <span class="file-name">${escapeHtml(file.originalName)}</span>
      <span class="file-size">${formatFileSize(file.fileSize)}</span>
      <div class="file-actions">
        <button class="btn btn-secondary" type="button">Preview</button>
        <a class="btn btn-primary" href="/api/notes/${note._id}/files/${file._id}/download${tokenParam}">Download</a>
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

  // FIX: same token-as-query-param fix for the inline preview iframe.
  // <iframe src="..."> cannot send the Authorization header either, so
  // the preview must carry the token in the URL itself.
  const token = localStorage.getItem("token");
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

  const viewUrl = `/api/notes/${currentNoteId}/files/${file._id}/view${tokenParam}`;
  const downloadUrl = `/api/notes/${currentNoteId}/files/${file._id}/download${tokenParam}`;

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