const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGO_URI in environment.");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = { connectDb };

