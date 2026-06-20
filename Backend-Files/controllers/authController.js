const user = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

// -----------------------------------------------------signup API Logic--------------------------------------------
const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      university,
      graduationYear,
      password,
      confirmPassword,
      terms,
      newsletter,
    } = req.body;

    // Check all required fields are filled
    if (
      !firstName ||
      !lastName ||
      !email ||
      !university ||
      !password ||
      !confirmPassword
    ) {
      // FIX: use status(400) so the frontend's fetch() can detect this
      // as an actual error instead of a 200 success
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password do not match",
      });
    }

    if (!terms) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and conditions",
      });
    }

    // Check if user already exists
    const existingUser = await user.findOne({ email });

    if (existingUser) {
      // FIX: 409 means "conflict" — this email is already taken
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const newsletterBoolean = newsletter === "on" ? true : false;

    // Create new user
    const newUser = new user({
      firstName,
      lastName,
      fullName: firstName + " " + lastName,
      email,
      password,
      university,
      graduationYear,
      newsletter: newsletterBoolean,
    });

    await newUser.save();

    console.log("New user registered:", newUser.firstName);

    res.status(201).json({
      success: true,
      message: `Welcome ${newUser.firstName}! Registration successful.`,
      user: {
        firstName: newUser.firstName,
        email: newUser.email,
        university: newUser.university,
      },
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// -----------------------------------------------------Login API Logic--------------------------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields",
      });
    }

    const existingUser = await user.findOne({ email });

    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email does not have an account",
      });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    // FIX: removed the old "else" block here. The two checks above
    // already return early if something is wrong, so the rest of this
    // function only runs when the login is actually successful. We
    // don't need an else — this is simpler to read.

    console.log("User signed in:", existingUser.fullName);

    const token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: `Welcome back, ${existingUser.fullName}!`,
      token: token,
      user: {
        fullname: existingUser.fullName,
        email: existingUser.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// -----------------------------------------------------Logout API Logic--------------------------------------------
const logout = (req, res) => {
  try {
    res.json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// -----------------------------------------------Forget Password API Logic------------------------------
const forgetPassword = async (req, res) => {
  // FIX: the whole function is now wrapped in try/catch. Before, if
  // nodemailer or the database failed, the server would crash with an
  // unhandled error instead of sending a proper response.
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email",
      });
    }

    const existingUser = await user.findOne({ email });

    // FIX: we always send the SAME response whether the user exists or
    // not. This stops attackers from being able to check which emails
    // are registered just by watching for different responses.
    if (!existingUser) {
      return res.json({
        success: true,
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expireTime = Date.now() + 3600000; // 1 hour

    existingUser.resetPasswordToken = token;
    existingUser.resetPasswordExpires = expireTime;
    await existingUser.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetURL = `${process.env.BASE_URL}/reset-password/${token}`;

    const mailOptions = {
      from: "EduNest <mr.hvsd01@gmail.com>",
      to: existingUser.email,
      subject: "Reset Your Password",
      html: `<p>Click this link to reset your password:</p>
             <a href="${resetURL}">${resetURL}</a>
             <p>This link expires in 1 hour.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (err) {
    // DEBUG: log the full error object, not just the message, so we
    // can see exactly what's failing (bad credentials, network issue,
    // wrong field name, etc.)
    console.error("Forget password error (full):", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// ----------------------------------Reset Password --------------------
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required.",
      });
    }

    const existingUser = await user.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // token must still be valid
    });

    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: "Token is invalid or has expired.",
      });
    }

    // FIX: hash the new password directly here instead of trusting a
    // schema hook to do it. This way we know for sure the password is
    // never saved as plain text.
    const hashedPassword = await bcrypt.hash(password, 10);

    existingUser.password = hashedPassword;
    existingUser.resetPasswordToken = undefined;
    existingUser.resetPasswordExpires = undefined;

    await existingUser.save();

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

module.exports = { signup, login, logout, forgetPassword, resetPassword };