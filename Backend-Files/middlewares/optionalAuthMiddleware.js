const jwt = require("jsonwebtoken");

// Unlike authMiddleware, this does NOT block the request if there's no
// token or an invalid one — it just attaches req.user if a valid token
// is present, and leaves req.user undefined otherwise.
//
// FIX: also checks for a "token" query parameter as a fallback. This is
// required because <iframe src="..."> and <a href="..."> navigations
// (used for PDF preview/download) cannot send custom headers like
// Authorization — the browser only sends headers on fetch()/XHR calls.
// Without this fallback, every private-note view/download request
// arrives with NO auth info at all, even from the note's own owner,
// causing an incorrect 403.
const optionalAuth = (req, res, next) => {
  const authHeader   = req.headers["authorization"];
  const headerToken   = authHeader && authHeader.split(" ")[1];
  const queryToken     = req.query.token;
  const token          = headerToken || queryToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // Invalid/expired token — just proceed as anonymous, don't block
  }

  next();
};

module.exports = optionalAuth;