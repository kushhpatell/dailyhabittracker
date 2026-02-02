const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const { signToken, requireAuth } = require("../lib/auth");

const authRouter = express.Router();

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { username, password } = parsed.data;

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "Username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash });
  const token = signToken({ sub: user._id.toString(), username: user.username });
  return res.json({ token, user: { id: user._id, username: user.username } });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { username, password } = parsed.data;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ sub: user._id.toString(), username: user.username });
  return res.json({ token, user: { id: user._id, username: user.username } });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  return res.json({ user: { id: user._id, username: user.username } });
});

const updateUsernameSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
});

authRouter.post("/update-username", requireAuth, async (req, res) => {
  const parsed = updateUsernameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { username } = parsed.data;

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "Username already exists" });

  const user = await User.findByIdAndUpdate(
    req.user.sub,
    { $set: { username } },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "Not found" });

  const token = signToken({ sub: user._id.toString(), username: user.username });
  return res.json({ token, user: { id: user._id, username: user.username } });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { currentPassword, newPassword } = parsed.data;

  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: "Not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid current password" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ ok: true });
});

module.exports = { authRouter };

