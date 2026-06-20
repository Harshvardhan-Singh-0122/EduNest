// ─── Search functionality ──────────────────────────────────────────────────
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (query) {
        searchInput.style.transform = 'scale(1.02)';
        setTimeout(() => {
            searchInput.style.transform = 'scale(1)';
        }, 200);
        window.location.href = '/Search?q=' + encodeURIComponent(query);
    } else {
        searchInput.focus();
    }
}

function setSearch(term) {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = term;
    searchInput.focus();
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// ─── Animated counter for stats ────────────────────────────────────────────
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

function animateRealStats(notes) {
    const totalDownloads = notes.reduce((sum, n) => sum + (n.downloads || 0), 0);
    const uniqueUploaders = new Set(notes.map((n) => n.userId?._id).filter(Boolean));
    const uniqueSubjects  = new Set(notes.map((n) => n.subject).filter(Boolean));

    animateCounter(document.getElementById('notesCount'), notes.length);
    animateCounter(document.getElementById('studentsCount'), uniqueUploaders.size);
    animateCounter(document.getElementById('subjectsCount'), uniqueSubjects.size);
    animateCounter(document.getElementById('downloadsCount'), totalDownloads);
}

// ─── Mobile menu toggle ─────────────────────────────────────────────────────
function toggleMobileMenu() {
    const navAuth = document.querySelector('.nav-auth');
    if (navAuth.style.display === 'flex') {
        navAuth.style.display = 'none';
    } else {
        navAuth.style.display = 'flex';
        navAuth.style.position = 'absolute';
        navAuth.style.top = '100%';
        navAuth.style.right = '2rem';
        navAuth.style.background = 'white';
        navAuth.style.padding = '1rem';
        navAuth.style.borderRadius = '8px';
        navAuth.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        navAuth.style.border = '1px solid #e5e5e5';
    }
}

window.addEventListener('load', function () {
    setTimeout(() => {
        document.getElementById('searchInput').focus();
    }, 500);
});

// ─── Popular Notes Section — backed by real data ───────────────────────────
let allNotes = [];
let currentNotesCount = 0;
const notesPerLoad = 3;

// NEW: track current user id (if logged in) so we know whether to show
// "Request Access" or "Pending..." or nothing (already has access)
let currentUserId = null;

function createNoteCard(note) {
    const uploaderName = note.userId?.fullName || 'EduNest user';
    const fileType = note.files && note.files.length > 0 ? 'PDF' : 'No file';

    // NEW: private + locked notes show a lock badge and a request button
    // instead of the normal file-type badge and full content
    if (note.isLocked) {
        return `
            <div class="note-card locked-note">
                <div class="file-type locked-badge">🔒 Private</div>
                <div class="note-header">
                    <div class="note-subject">${escapeHtml(note.subject)}</div>
                    <h3 class="note-title">${escapeHtml(note.title)}</h3>
                </div>
                <div class="note-meta">
                    <div class="note-author">
                        by ${escapeHtml(uploaderName)}
                    </div>
                </div>
                <button class="btn btn-secondary request-access-btn"
                        style="margin-top: 0.75rem; width: 100%;"
                        onclick="event.stopPropagation(); requestNoteAccess('${note._id}', this)">
                    🔒 Request Access
                </button>
            </div>
        `;
    }

    return `
        <div class="note-card" onclick="viewNote('${note._id}')">
            <div class="file-type">${fileType}</div>
            <div class="note-header">
                <div class="note-subject">${escapeHtml(note.subject)}</div>
                <h3 class="note-title">${escapeHtml(note.title)}</h3>
            </div>
            <div class="note-meta">
                <div class="note-stats">
                    <div class="stat-item">
                        <span>📥</span>
                        <span>${note.downloads || 0}</span>
                    </div>
                </div>
                <div class="note-author">
                    by ${escapeHtml(uploaderName)}
                </div>
            </div>
        </div>
    `;
}

// NEW: sends a request-access call to the backend for a private note
function requestNoteAccess(noteId, btnEl) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/signin';
        return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Sending request...';

    fetch(`/api/notes/${noteId}/request-access`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                btnEl.textContent = '✓ Request sent';
                btnEl.style.background = '#2ecc71';
                btnEl.style.color = 'white';
            } else {
                btnEl.disabled = false;
                btnEl.textContent = data.message || 'Request failed — try again';
            }
        })
        .catch(() => {
            btnEl.disabled = false;
            btnEl.textContent = 'Request failed — try again';
        });
}

function loadMoreNotes() {
    const loading = document.getElementById('loading');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const notesGrid = document.getElementById('notesGrid');

    loading.classList.remove('hidden');
    loadMoreBtn.style.display = 'none';

    if (allNotes.length === 0 && currentNotesCount === 0) {
        // NEW: send the auth token if available so the backend can
        // correctly filter private notes the user has access to —
        // but this still works fine for anonymous visitors too
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        fetch('/api/notes', { headers })
            .then((res) => res.json())
            .then((data) => {
                if (!data.success) {
                    notesGrid.innerHTML = '<p>Could not load notes right now.</p>';
                    loading.classList.add('hidden');
                    return;
                }

                allNotes = data.notes;
                animateRealStats(allNotes);
                renderNextBatch();
            })
            .catch(() => {
                notesGrid.innerHTML = '<p>Could not load notes right now.</p>';
                loading.classList.add('hidden');
            });
    } else {
        renderNextBatch();
    }
}

function renderNextBatch() {
    const loading = document.getElementById('loading');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const notesGrid = document.getElementById('notesGrid');

    setTimeout(() => {
        const notesToShow = allNotes.slice(currentNotesCount, currentNotesCount + notesPerLoad);

        if (notesToShow.length === 0 && currentNotesCount === 0) {
            notesGrid.innerHTML = '<p>No notes have been uploaded yet. Be the first!</p>';
        } else {
            notesToShow.forEach((note) => {
                notesGrid.innerHTML += createNoteCard(note);
            });
        }

        currentNotesCount += notesPerLoad;
        loading.classList.add('hidden');

        if (currentNotesCount < allNotes.length) {
            loadMoreBtn.style.display = 'inline-block';
        } else {
            loadMoreBtn.innerHTML = 'No more notes to load';
            loadMoreBtn.disabled = true;
            loadMoreBtn.style.opacity = '0.5';
        }
    }, 400);
}

function viewNote(noteId) {
    window.location.href = '/notes/' + noteId;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    loadMoreNotes();
});

document.addEventListener('DOMContentLoaded', function () {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });

    setTimeout(() => {
        document.querySelectorAll('.note-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }, 100);
});