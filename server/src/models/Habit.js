const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true, trim: true },
    tag: { type: String, default: "", trim: true },
    color: { type: String, default: "#7c3aed" },
    notes: { type: String, default: "", trim: true },
    schedule: {
      days: { type: [String], default: [] }, // e.g. ["Mon","Wed","Fri"]
      time: { type: String, default: "" }, // "07:00"
    },
    exercises: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          sets: { type: Number, default: 3 },
          reps: { type: Number, default: 10 },
          notes: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    waterGoalMl: { type: Number, default: 0 }, // e.g. 2000
    checks: {
      type: Map,
      of: Boolean, // dateString -> true
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);

