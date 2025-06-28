const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const authRoutes = require("./auth");
const authenticateToken = require("./middleware/authenticate");
const User = require("./models/user");
require('dotenv').config();

const app = express();
const port = 3000;

const mongoURI = process.env.ATLAS_URI;
console.log("📡 Connecting to:", mongoURI);

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);

const axios = require("axios");

app.get("/questions", async (req, res) => {
  const num = parseInt(req.query.num) || 10;
  const category = req.query.category || "";

  const url = `https://opentdb.com/api.php?amount=${num}${category ? `&category=${category}` : ""}&type=multiple`;

  try {
    const response = await axios.get(url);
    const formatted = response.data.results.map((q) => {
      const allAnswers = [...q.incorrect_answers, q.correct_answer].sort(() => 0.5 - Math.random());
      return {
        question: decodeHTML(q.question),
        A: decodeHTML(allAnswers[0]),
        B: decodeHTML(allAnswers[1]),
        C: decodeHTML(allAnswers[2]),
        D: decodeHTML(allAnswers[3]),
        answer: ["A", "B", "C", "D"][allAnswers.indexOf(q.correct_answer)]
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("❌ Failed to fetch trivia questions:", error.message);
    res.status(500).json({ error: "Trivia API error" });
  }
});

function decodeHTML(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
app.post("/submit-score", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.scores.push({ score: req.body.score });
    await user.save();
    res.json({ message: "Score saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save score" });
  }
});

app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username scores");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Profile fetch failed" });
  }
});

app.get("/leaderboard", authenticateToken, async (req, res) => {
  try {
    const allUsers = await User.aggregate([
      { $unwind: "$scores" },
      {
        $group: {
          _id: "$_id",
          username: { $first: "$username" },
          topScore: { $max: "$scores.score" }
        }
      },
      { $sort: { topScore: -1 } }
    ]);

    const top10 = allUsers.slice(0, 10);
    const userIndex = allUsers.findIndex(u => u._id.toString() === req.user.id);
    const currentUser = userIndex >= 0 ? {
      rank: userIndex + 1,
      ...allUsers[userIndex]
    } : null;

    res.json({ top10, currentUser });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
