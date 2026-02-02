const jwt = require("jsonwebtoken");

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment.");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment.");
  return jwt.verify(token, secret);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token =
    header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { signToken, verifyToken, requireAuth };

