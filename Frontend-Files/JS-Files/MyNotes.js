window.onload = function () {
  const token = localStorage.getItem("token");

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

      document.getElementById("profile-fullname").innerText = data.user.firstName;
      document.getElementById("profile-universityName").innerText = data.user.university;

      fetchMyNotes(token);
    })
    .catch(() => {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    });
};

function fetchMyNotes(token) {
  const container = document.getElementById("myNotesContainer");
  container.innerHTML = `<p style="color:#7f8c8d;">Loading your notes...</p>`;

  fetch("/api/notes/my", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.notes) {
        container.innerHTML = `<p style="color:red;">Failed to load notes</p>`;
        return;
      }

      if (data.notes.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d;">You haven't uploaded any notes yet.</p>`;
        return;
      }

      container.innerHTML = "";
      data.notes.forEach((note) => {
        const noteCard = document.createElement("div");
        noteCard.classList.add("note-card");
        noteCard.innerHTML = `
          <div class="note-title">${escapeHtml(note.title)}</div>
          <div class="note-meta">
            <span class="note-subject">${escapeHtml(note.subject)}</span>
            <span>${new Date(note.uploadAt).toLocaleDateString()}</span>
          </div>
          <p style="margin-top:0.75rem;color:#5f6f7d;">${escapeHtml(note.description)}</p>
          <div class="note-stats">
            <div class="note-stat">${note.downloads || 0} downloads</div>
            <div class="note-stat">${note.likes || 0} likes</div>
            <div class="note-stat">${note.files?.length || 0} file(s)</div>
          </div>
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <a class="btn btn-primary" href="/notes/${note._id}">Open Note</a>
            ${renderFirstDownload(note)}
          </div>
        `;
        container.appendChild(noteCard);
      });
    })
    .catch(() => {
      container.innerHTML = `<p style="color:red;">Failed to load notes</p>`;
    });
}

function renderFirstDownload(note) {
  if (!note.files || note.files.length === 0) {
    return "";
  }

  const file = note.files[0];
  return `<a class="btn" style="background:#f1f2f6;" href="/api/notes/${note._id}/files/${file._id}/download">Download PDF</a>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
