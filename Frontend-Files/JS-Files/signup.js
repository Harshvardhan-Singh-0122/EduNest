document.getElementById("signupForm").addEventListener("submit", function (e) {
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

  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "university",
    "password",
    "confirmPassword",
  ];

  requiredFields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input.value.trim()) {
      showError(field, "This field is required");
      isValid = false;
    }
  });

  const email = document.getElementById("email").value;
  if (email && !isValidEmail(email)) {
    showError("email", "Please enter a valid email address");
    isValid = false;
  }

  const password = document.getElementById("password").value;
  if (password && !isStrongPassword(password)) {
    showError(
      "password",
      "Password must be at least 8 characters with uppercase, lowercase, and numbers"
    );
    isValid = false;
  }

  const confirmPassword = document.getElementById("confirmPassword").value;
  if (password !== confirmPassword) {
    showError("confirmPassword", "Passwords do not match");
    isValid = false;
  }

  if (!document.getElementById("terms").checked) {
    alert("Please accept the Terms of Service and Privacy Policy");
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

function isStrongPassword(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasMinLength = password.length >= 8;

  return hasUpperCase && hasLowerCase && hasNumbers && hasMinLength;
}

function submitForm() {
  const submitBtn = document.getElementById("submitBtn");
  const loadingMessage = document.getElementById("loadingMessage");
  const successMessage = document.getElementById("successMessage");

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating Account...";
  loadingMessage.style.display = "block";

  const formData = new FormData(document.getElementById("signupForm"));
  const formObject = {};
  formData.forEach((value, key) => {
    formObject[key] = value;
  });

  fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formObject),
  })
    .then((response) => response.json())
    .then((data) => {
      loadingMessage.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";

      if (data.success) {
        successMessage.textContent = data.message;
        successMessage.style.display = "block";
        document.getElementById("signupForm").reset();

        setTimeout(() => {
          window.location.href = "/signin";
        }, 2000);
      } else {
        alert(data.message || "Registration failed. Please try again.");
      }
    })
    .catch((error) => {
      loadingMessage.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";

      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    });
}

function togglePassword(fieldId) {
  const passwordField = document.getElementById(fieldId);
  const toggleBtn = passwordField.nextElementSibling;

  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleBtn.textContent = "Hide";
  } else {
    passwordField.type = "password";
    toggleBtn.textContent = "Show";
  }
}

document.getElementById("password").addEventListener("input", function () {
  const password = this.value;
  const strengthIndicator = document.getElementById("passwordStrength");

  if (!password) {
    strengthIndicator.textContent = "";
    return;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 8;
  const score = [
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChars,
    hasMinLength,
  ].filter(Boolean).length;

  if (score < 3) {
    strengthIndicator.textContent = "Weak password";
    strengthIndicator.className = "password-strength strength-weak";
  } else if (score < 5) {
    strengthIndicator.textContent = "Medium password";
    strengthIndicator.className = "password-strength strength-medium";
  } else {
    strengthIndicator.textContent = "Strong password";
    strengthIndicator.className = "password-strength strength-strong";
  }
});

function signupWithGoogle() {
  alert("Google signup integration will be implemented with backend");
}

function signupWithFacebook() {
  alert("Facebook signup integration will be implemented with backend");
}

window.addEventListener("load", function () {
  setTimeout(() => {
    document.getElementById("firstName").focus();
  }, 300);
});
