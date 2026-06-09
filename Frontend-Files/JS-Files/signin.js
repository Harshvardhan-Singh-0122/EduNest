document.getElementById("signinForm").addEventListener("submit", function (e) {
  e.preventDefault();

  if (validateForm()) {
    submitForm();
  }
});

function validateForm() {
  let isValid = true;

  document.querySelectorAll(".error-message").forEach((el) => {
    el.style.display = "none";
    el.textContent = "";
  });

  const email = document.getElementById("email").value.trim();
  if (!email) {
    showError("email", "Email is required");
    isValid = false;
  } else if (!isValidEmail(email)) {
    showError("email", "Please enter a valid email address");
    isValid = false;
  }

  const password = document.getElementById("password").value;
  if (!password) {
    showError("password", "Password is required");
    isValid = false;
  } else if (password.length < 6) {
    showError("password", "Password must be at least 6 characters");
    isValid = false;
  }

  return isValid;
}

function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + "Error");
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function submitForm() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const submitBtn = document.getElementById("submitBtn");
  const loadingMessage = document.getElementById("loadingMessage");
  const successMessage = document.getElementById("successMessage");

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing In...";
  loadingMessage.style.display = "block";

  fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      loadingMessage.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";

      if (data.success) {
        localStorage.setItem("token", data.token);
        successMessage.style.display = "block";

        setTimeout(() => {
          window.location.href = "/Dashboard";
        }, 2000);
      } else {
        alert(data.message || "Signin failed. Please try again.");
      }
    })
    .catch((error) => {
      loadingMessage.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";

      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    });
}

function togglePassword() {
  const passwordField = document.getElementById("password");
  const toggleBtn = document.querySelector(".password-toggle");

  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleBtn.textContent = "Hide";
  } else {
    passwordField.type = "password";
    toggleBtn.textContent = "Show";
  }
}

document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    document.getElementById("signinForm").dispatchEvent(new Event("submit"));
  }
});

function signinWithGoogle() {
  alert("Google sign-in integration will be implemented with backend");
}

function signinWithFacebook() {
  alert("Facebook sign-in integration will be implemented with backend");
}

window.addEventListener("load", function () {
  setTimeout(() => {
    document.getElementById("email").focus();
  }, 300);
});
