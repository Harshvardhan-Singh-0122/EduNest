const express = require('express');
const path = require('path');
const router = express.Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/../../Frontend-Files/index.html"));
});

router.get("/signin", (req, res) => {
  res.sendFile(path.join(__dirname , "/../../Frontend-Files/signin.html"));
});

router.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname , "/../../Frontend-Files/signup.html"));
});

router.get("/Dashboard", (req, res) => {
  res.sendFile(path.join(__dirname , "/../../Frontend-Files/Dashboard.html"));
});

router.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname , "/../../Frontend-Files/upload.html"));
});

router.get("/Search", (req, res) => {
  res.sendFile(path.join(__dirname , "/../../Frontend-Files/SearchResult.html"));
});

router.get("/reset-password/:token", (req, res) => {
  res.sendFile(path.join(__dirname , "/../../Frontend-Files/newPassword.html"));
});

module.exports = router;
