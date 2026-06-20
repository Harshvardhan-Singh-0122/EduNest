// ─── Shared notification bell logic ────────────────────────────────────────
// Include this file on EVERY page that has the notification bell HTML
// (paste <script src="JS-Files/notifications.js"></script> before </body>,
// after your page-specific script, or anywhere after the bell HTML exists)

function toggleNotifDropdown() {
  const menu = document.getElementById("notifMenu");
  const wasOpen = menu.classList.contains("show");
  menu.classList.toggle("show");

  // Refresh notifications every time the dropdown is opened
  if (!wasOpen) {
    loadNotifications();
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", function (event) {
  const menu = document.getElementById("notifMenu");
  const btn  = document.getElementById("notifBtn");
  if (menu && btn && !btn.contains(event.target) && !menu.contains(event.target)) {
    menu.classList.remove("show");
  }
});

function loadNotifications() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const list = document.getElementById("notifList");
  list.innerHTML = `<p class="notif-empty">Loading...</p>`;

  fetch("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      updateBadge(data.unreadCount || 0);

      if (!data.success || !data.notifications || data.notifications.length === 0) {
        list.innerHTML = `<p class="notif-empty">No notifications yet</p>`;
        return;
      }

      list.innerHTML = "";
      data.notifications.forEach((n) => renderNotification(n, list));
    })
    .catch(() => {
      list.innerHTML = `<p class="notif-empty">Could not load notifications</p>`;
    });
}

function renderNotification(n, container) {
  const item = document.createElement("div");
  item.className = "notif-item" + (n.read ? "" : " unread");

  const timeAgo = formatTimeAgo(n.createdAt);

  let actionsHtml = "";
  // FIX: only show Approve/Deny buttons while the notification is still
  // UNREAD. The backend now marks the original access_request
  // notification as read the moment the owner approves or denies it,
  // so on reload, already-handled requests no longer show the buttons.
  if (n.type === "access_request" && n.relatedRequestId && !n.read) {
    actionsHtml = `
      <div class="notif-actions">
        <button class="notif-action-btn approve" onclick="handleApprove('${n.relatedRequestId}', this)">Approve</button>
        <button class="notif-action-btn deny" onclick="handleDeny('${n.relatedRequestId}', this)">Deny</button>
      </div>
    `;
  } else if (n.type === "access_request" && n.read) {
    // Already handled — show a neutral note instead of buttons
    actionsHtml = `<div class="notif-actions"><span style="color:#999;font-size:0.78rem;">Already handled</span></div>`;
  }

  item.innerHTML = `
    <div class="notif-item-msg">${escapeHtmlNotif(n.message)}</div>
    <div class="notif-item-time">${timeAgo}</div>
    ${actionsHtml}
  `;

  item.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") {
      markAsRead(n._id, item);
    }
  });

  container.appendChild(item);
}

function handleApprove(requestId, btnEl) {
  const token = localStorage.getItem("token");
  btnEl.parentElement.querySelectorAll("button").forEach((b) => (b.disabled = true));

  fetch(`/api/access-requests/${requestId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        btnEl.parentElement.innerHTML = `<span style="color:#2ecc71;font-size:0.8rem;">Approved ✓</span>`;
      } else {
        btnEl.parentElement.innerHTML = `<span style="color:#999;font-size:0.8rem;">${escapeHtmlNotif(data.message || "Already handled")}</span>`;
      }
    })
    .catch(() => {
      btnEl.parentElement.innerHTML = `<span style="color:#e74c3c;font-size:0.8rem;">Failed — try again</span>`;
    });
}

function handleDeny(requestId, btnEl) {
  const token = localStorage.getItem("token");
  btnEl.parentElement.querySelectorAll("button").forEach((b) => (b.disabled = true));

  fetch(`/api/access-requests/${requestId}/deny`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        btnEl.parentElement.innerHTML = `<span style="color:#e74c3c;font-size:0.8rem;">Denied</span>`;
      } else {
        btnEl.parentElement.innerHTML = `<span style="color:#999;font-size:0.8rem;">${escapeHtmlNotif(data.message || "Already handled")}</span>`;
      }
    })
    .catch(() => {
      btnEl.parentElement.innerHTML = `<span style="color:#e74c3c;font-size:0.8rem;">Failed — try again</span>`;
    });
}

function markAsRead(notificationId, itemEl) {
  const token = localStorage.getItem("token");
  if (!itemEl.classList.contains("unread")) return;

  fetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        itemEl.classList.remove("unread");
        refreshBadgeCount();
      }
    })
    .catch(() => {});
}

function refreshBadgeCount() {
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => updateBadge(data.unreadCount || 0))
    .catch(() => {});
}

function updateBadge(count) {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 9 ? "9+" : count;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function formatTimeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeHtmlNotif(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Load the unread count on every page load (without opening the dropdown)
document.addEventListener("DOMContentLoaded", function () {
  refreshBadgeCount();
});