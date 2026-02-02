const express = require("express");
const { z } = require("zod");
const Habit = require("../models/Habit");
const { requireAuth } = require("../lib/auth");

const analyticsRouter = express.Router();
analyticsRouter.use(requireAuth);

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  onlyActive: z.coerce.boolean().optional().default(true),
});

analyticsRouter.get("/daily", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const userId = req.user.sub;
  const { from, to, days, onlyActive } = parsed.data;

  const end = to ? new Date(to + "T00:00:00.000Z") : new Date();
  const start = from
    ? new Date(from + "T00:00:00.000Z")
    : addDays(end, -(days - 1));

  // Normalize to UTC midnight
  end.setUTCHours(0, 0, 0, 0);
  start.setUTCHours(0, 0, 0, 0);

  const habits = await Habit.find({ userId }).lean();
  const total = habits.length;

  // Build date list inclusive
  const rows = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const dateStr = ymd(d);
    let completed = 0;
    const doneHabitIds = [];
    for (const h of habits) {
      const checks = h.checks ? Object.fromEntries(Object.entries(h.checks)) : {};
      if (checks[dateStr]) {
        completed += 1;
        doneHabitIds.push(String(h._id));
      }
    }
    const percent = total ? Math.round((completed / total) * 100) : 0;
    if (!onlyActive || completed > 0) {
      rows.push({ date: dateStr, completed, total, percent, doneHabitIds });
    }
  }

  return res.json({ from: ymd(start), to: ymd(end), totalHabits: total, days: rows });
});

module.exports = { analyticsRouter };

