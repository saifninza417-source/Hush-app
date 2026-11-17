# Hush — your own server

A small Node.js server plus the Hush page. Posts and replies live in a `data.json`
file on the server and are shared with everyone who opens the page — no sign-in,
no claude.ai involved.

## Deploy it free (no local setup needed)

1. Create a free account at **github.com** if you don't already have one.
2. Make a new repository and upload these into it, keeping the folder structure:
   `server.js`, `package.json`, `README.md`, and the `public` folder (with
   `index.html` inside it).
3. Create a free account at **render.com** and sign in with that GitHub account.
4. Click **New → Web Service**, and pick the repository you just made.
5. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Click **Create Web Service**. Render installs and starts it — a couple of
   minutes the first time.
7. You'll get a live link like `https://hush-xyz.onrender.com`. That's the one
   to share from now on, instead of the claude.ai link.

## Admin panel (delete posts, block someone)

There's a password-protected page at `/admin.html` (e.g.
`https://hush-xyz.onrender.com/admin.html`) where you can see every post with
the poster's IP, delete a post or a single reply, and block an IP from
posting again.

To set it up: in Render, open your service → **Environment** → add a variable
named `ADMIN_KEY` with any password you choose → save (it redeploys
automatically). Open `/admin.html` and enter that same key to get in. Without
`ADMIN_KEY` set, the admin page and its endpoints simply refuse everyone,
including you.

A few limits worth knowing: this is IP-based, not account-based — there's no
real "user" to delete, since the whole app is intentionally anonymous.
Blocking stops that IP from posting again, but it's not foolproof (a new
network, VPN, or phone connection is a different IP) and it doesn't touch
what was already posted — delete that separately. And since content here is
just people's own feelings, it's worth using "delete" for things that are
actually unsafe, cruel, or spam, rather than for posts you simply disagree
with — heavy-handed moderation tends to defeat the point of an anonymous
space pretty fast.

## Honest notes

- Render's free tier can fall asleep after quiet periods — the first visit
  after a lull may take ~30 seconds to wake back up.
- Data lives in a file on the server. On a free tier that file can be wiped on
  a redeploy — treat this as a casual, gentle space, not permanent storage.
- There's a basic per-visitor rate limit built into the server, but nothing
  stops someone determined to abuse it — the 🚩 flag/hide button is still the
  main safety net, same as before.
- Want this on your own domain instead of the onrender.com one? Render (and
  most hosts like it) let you attach a custom domain for free once it's live —
  that's a setting on the service itself after deploy.
