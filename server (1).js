const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const DATA_FILE = path.join(__dirname, "data.json");

app.set("trust proxy", true); // so req.ip is the real visitor IP behind a host's proxy
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function seedData() {
  const t = Date.now();
  return {
    posts: [
      { id: "s1", text: "I smile all day at work and then go home and feel nothing. I don't know who to tell.", mood: "Lonely", gender: "female", alias: "Misty Wren 214", emoji: "🐦", ts: t - 3600e3, flagged: false },
      { id: "s2", text: "Big exam tomorrow and my chest feels tight. I just needed to say it somewhere.", mood: "Anxious", gender: "male", alias: "Calm Otter 482", emoji: "🦦", ts: t - 1800e3, flagged: false }
    ],
    replies: [
      { id: "r1", postId: "s1", text: "I feel this a lot. You're not weird for feeling it. Thank you for saying it here.", gender: "male", alias: "Kind Deer 330", emoji: "🦌", ts: t - 3000e3 }
    ],
    blocked: []
  };
}

function loadData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!d.blocked) d.blocked = [];
    return d;
  } catch (e) { const d = seedData(); saveData(d); return d; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// very small in-memory per-IP rate limiter (resets if the server restarts)
const lastAction = {};
function tooSoon(key, minGapMs) {
  const now = Date.now(), last = lastAction[key] || 0;
  if (now - last < minGapMs) return true;
  lastAction[key] = now;
  return false;
}
function clean(s, max) { return String(s == null ? "" : s).slice(0, max); }
function publicView(o) { const { _ip, ...rest } = o; return rest; } // never leak IPs to regular visitors
function isBlocked(data, ip) { return data.blocked.includes(ip); }

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return res.status(503).json({ error: "Admin access isn't set up on this server yet (no ADMIN_KEY env var)." });
  if (req.get("X-Admin-Key") !== ADMIN_KEY) return res.status(401).json({ error: "Wrong admin key." });
  next();
}

// ---------- public ----------

app.get("/api/posts", (req, res) => {
  res.json(loadData().posts.filter(p => !p.flagged).map(publicView));
});

app.post("/api/posts", (req, res) => {
  const data = loadData();
  if (isBlocked(data, req.ip)) return res.status(403).json({ error: "You've been blocked from posting here." });
  if (tooSoon("post:" + req.ip, 14000)) return res.status(429).json({ error: "Slow down a little — try again in a few seconds." });
  const b = req.body || {};
  const text = clean(b.text, 600).trim();
  if (!text) return res.status(400).json({ error: "Post can't be empty." });
  const post = {
    id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    text, mood: clean(b.mood, 40), gender: clean(b.gender, 20) || "private",
    alias: clean(b.alias, 40) || "Someone", emoji: clean(b.emoji, 8) || "🫧",
    ts: Date.now(), flagged: false, _ip: req.ip
  };
  data.posts.unshift(post);
  data.posts = data.posts.slice(0, 500);
  saveData(data);
  res.json(publicView(post));
});

app.patch("/api/posts/:id/flag", (req, res) => {
  const data = loadData();
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Not found." });
  post.flagged = true;
  saveData(data);
  res.json({ ok: true });
});

app.get("/api/replies", (req, res) => {
  res.json(loadData().replies.map(publicView));
});

app.post("/api/replies", (req, res) => {
  const data = loadData();
  if (isBlocked(data, req.ip)) return res.status(403).json({ error: "You've been blocked from posting here." });
  if (tooSoon("reply:" + req.ip, 4000)) return res.status(429).json({ error: "Slow down a little — try again in a few seconds." });
  const b = req.body || {};
  const text = clean(b.text, 400).trim();
  const postId = clean(b.postId, 40);
  if (!text || !postId) return res.status(400).json({ error: "Missing reply text." });
  const reply = {
    id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    postId, text, gender: clean(b.gender, 20) || "private",
    alias: clean(b.alias, 40) || "Someone", emoji: clean(b.emoji, 8) || "🫧",
    ts: Date.now(), _ip: req.ip
  };
  data.replies.push(reply);
  data.replies = data.replies.slice(-2000);
  saveData(data);
  res.json(publicView(reply));
});

// ---------- admin only (requires header X-Admin-Key) ----------

app.get("/api/admin/posts", requireAdmin, (req, res) => {
  const data = loadData();
  res.json({ posts: data.posts, replies: data.replies, blocked: data.blocked });
});

app.delete("/api/admin/posts/:id", requireAdmin, (req, res) => {
  const data = loadData();
  data.posts = data.posts.filter(p => p.id !== req.params.id);
  data.replies = data.replies.filter(r => r.postId !== req.params.id);
  saveData(data);
  res.json({ ok: true });
});

app.delete("/api/admin/replies/:id", requireAdmin, (req, res) => {
  const data = loadData();
  data.replies = data.replies.filter(r => r.id !== req.params.id);
  saveData(data);
  res.json({ ok: true });
});

app.post("/api/admin/block", requireAdmin, (req, res) => {
  const ip = clean((req.body || {}).ip, 60);
  if (!ip) return res.status(400).json({ error: "Missing ip." });
  const data = loadData();
  if (!data.blocked.includes(ip)) data.blocked.push(ip);
  saveData(data);
  res.json({ ok: true, blocked: data.blocked });
});

app.post("/api/admin/unblock", requireAdmin, (req, res) => {
  const ip = clean((req.body || {}).ip, 60);
  const data = loadData();
  data.blocked = data.blocked.filter(b => b !== ip);
  saveData(data);
  res.json({ ok: true, blocked: data.blocked });
});

app.listen(PORT, () => console.log("Hush server listening on port " + PORT));
