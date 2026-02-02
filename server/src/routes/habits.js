const express = require("express");
const { z } = require("zod");
const Habit = require("../models/Habit");
const { requireAuth } = require("../lib/auth");

const habitsRouter = express.Router();
habitsRouter.use(requireAuth);

const habitCreateSchema = z.object({
  name: z.string().min(1).max(60),
  tag: z.string().max(24).optional().default(""),
  color: z.string().max(20).optional().default("#7c3aed"),
  notes: z.string().max(140).optional().default(""),
});

const scheduleSchema = z.object({
  days: z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])).default([]),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().default(""),
});

const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  sets: z.number().int().min(1).max(50).optional().default(3),
  reps: z.number().int().min(1).max(200).optional().default(10),
  notes: z.string().max(140).optional().default(""),
});

const habitUpdateSchema = habitCreateSchema
  .extend({
    schedule: scheduleSchema.optional(),
    exercises: z.array(exerciseSchema).optional(),
    waterGoalMl: z.number().int().min(0).max(20000).optional(),
  })
  .partial();

const toggleSchema = z.object({
  date: z
    .preprocess((v) => {
      if (v == null || v === "") return new Date().toISOString().slice(0, 10);
      if (typeof v === "string") {
        // Accept YYYY-MM-DD or any date-ish string.
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return v.toISOString().slice(0, 10);
      }
      return v;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  done: z.coerce.boolean(),
});

habitsRouter.get("/", async (req, res) => {
  const userId = req.user.sub;
  const habits = await Habit.find({ userId }).sort({ createdAt: -1 }).lean();
  // Convert Map to plain object
  const normalized = habits.map((h) => ({
    ...h,
    checks: h.checks ? Object.fromEntries(Object.entries(h.checks)) : {},
  }));
  return res.json({ habits: normalized });
});

habitsRouter.get("/:id", async (req, res) => {
  const userId = req.user.sub;
  const habit = await Habit.findOne({ _id: req.params.id, userId }).lean();
  if (!habit) return res.status(404).json({ error: "Not found" });
  return res.json({
    habit: {
      ...habit,
      checks: habit.checks ? Object.fromEntries(Object.entries(habit.checks)) : {},
    },
  });
});

habitsRouter.post("/", async (req, res) => {
  const parsed = habitCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const userId = req.user.sub;
  const habit = await Habit.create({ userId, ...parsed.data });
  return res.status(201).json({ habit });
});

habitsRouter.patch("/:id", async (req, res) => {
  const parsed = habitUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const userId = req.user.sub;
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.id, userId },
    { $set: parsed.data },
    { new: true }
  );
  if (!habit) return res.status(404).json({ error: "Not found" });
  return res.json({ habit });
});

habitsRouter.delete("/:id", async (req, res) => {
  const userId = req.user.sub;
  const result = await Habit.deleteOne({ _id: req.params.id, userId });
  if (!result.deletedCount) return res.status(404).json({ error: "Not found" });
  return res.status(204).send();
});

habitsRouter.post("/:id/toggle", async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const userId = req.user.sub;
  const { date, done } = parsed.data;

  const update = done ? { [`checks.${date}`]: true } : { [`checks.${date}`]: undefined };
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.id, userId },
    done ? { $set: update } : { $unset: { [`checks.${date}`]: "" } },
    { new: true }
  );
  if (!habit) return res.status(404).json({ error: "Not found" });
  return res.json({ habit });
});

module.exports = { habitsRouter };

