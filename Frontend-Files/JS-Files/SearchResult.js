let currentResults = [];
let currentPage = 1;
const resultsPerPage = 6;

function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.toggle("show");
}

document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("profileDropdown");
  const profileBtn = document.querySelector(".profile-btn");

  if (dropdown && profileBtn && !profileBtn.contains(event.target)) {
    dropdown.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.querySelector(".search-input");
  const initialQuery = new URLSearchParams(window.location.search).get("q") || "";

  if (searchInput) {
    searchInput.value = initialQuery;
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        loadNotes(this.value.trim());
      }
    });
  }

  loadNotes(initialQuery);
});

function loadNotes(query = "") {
  const resultsSection = document.getElementById("resultsSection");
  resultsSection.innerHTML = `<p style="color:#7f8c8d;">Loading notes...</p>`;

  const url = query ? `/api/notes?q=${encodeURIComponent(query)}` : "/api/notes";

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        resultsSection.innerHTML = `<p style="color:red;">Failed to load notes.</p>`;
        return;
      }

      currentResults = data.notes || [];
      currentPage = 1;
      updateQueryText(query);
      renderResults();
    })
    .catch(() => {
      resultsSection.innerHTML = `<p style="color:red;">Failed to load notes.</p>`;
    });
}

function renderResults() {
  const resultsSection = document.getElementById("resultsSection");

  if (currentResults.length === 0) {
    resultsSection.innerHTML = `<p style="color:#7f8c8d;">No notes found.</p>`;
    updateSearchStats();
    return;
  }

  const startIndex = (currentPage - 1) * resultsPerPage;
  const pageResults = currentResults.slice(startIndex, startIndex + resultsPerPage);

  resultsSection.innerHTML =
    pageResults.map((note) => createResultCard(note)).join("") + createPagination();

  updateSearchStats();
}

function createResultCard(note) {
  const contributor = getContributorName(note.userId);
  const firstFile = note.files && note.files.length > 0 ? note.files[0] : null;
  const downloadButton = firstFile
    ? `<a href="/api/notes/${note._id}/files/${firstFile._id}/download" class="action-btn primary" onclick="event.stopPropagation();">Download</a>`
    : `<span class="action-btn" onclick="event.stopPropagation();">No PDF attached</span>`;

  return `
    <div class="result-card" onclick="viewNote('${note._id}')">
      <div class="result-header">
        <div>
          <a href="/notes/${note._id}" class="result-title" onclick="event.stopPropagation();">${escapeHtml(note.title)}</a>
          <div class="result-author">by ${escapeHtml(contributor)} - ${escapeHtml(note.university)}</div>
        </div>
      </div>
      <div class="result-meta">
        <span class="result-subject">${escapeHtml(note.subject)}</span>
        <span class="result-date">${new Date(note.uploadAt).toLocaleDateString()}</span>
        <span class="result-university">${escapeHtml(note.course)}</span>
      </div>
      <div class="result-description">
        ${escapeHtml(note.description)}
      </div>
      <div class="result-stats">
        <div class="result-stat"><span>${note.downloads || 0} downloads</span></div>
        <div class="result-stat"><span>${note.likes || 0} likes</span></div>
        <div class="result-stat"><span>${note.files?.length || 0} file(s)</span></div>
      </div>
      <div class="result-actions">
        <a href="/notes/${note._id}" class="action-btn" onclick="event.stopPropagation();">Open</a>
        ${downloadButton}
      </div>
    </div>
  `;
}

function createPagination() {
  const totalPages = Math.ceil(currentResults.length / resultsPerPage);
  if (totalPages <= 1) return "";

  let paginationHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `<a href="#" class="pagination-btn ${
      i === currentPage ? "active" : ""
    }" onclick="changePage(${i}); return false;">${i}</a>`;
  }

  return `<div class="pagination">${paginationHTML}</div>`;
}

function changePage(page) {
  currentPage = page;
  renderResults();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function filterResults(filterType) {
  if (filterType === "most-downloaded") {
    currentResults.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (filterType === "recent") {
    currentResults.sort((a, b) => new Date(b.uploadAt) - new Date(a.uploadAt));
  }

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (event?.target) {
    event.target.classList.add("active");
  }

  currentPage = 1;
  renderResults();
}

function filterBySubject() {
  renderResults();
}

function viewNote(noteId) {
  window.location.href = `/notes/${noteId}`;
}

function updateQueryText(query) {
  const searchQuery = document.getElementById("searchQuery");
  if (searchQuery) {
    searchQuery.textContent = query ? `Results for "${query}"` : "All Shared Notes";
  }
}

function updateSearchStats() {
  const searchStats = document.getElementById("searchStats");
  if (searchStats) {
    searchStats.textContent = `${currentResults.length} note(s) found`;
  }
}

function getContributorName(user) {
  if (!user) return "EduNest user";
  return user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "EduNest user";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
