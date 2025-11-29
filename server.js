// ===========================================
//  server.js — Sean's Hub Backend (JSON file)
// ===========================================
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const pg = require("pg");
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // needed for Render’s Postgres
});


const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// CORS (for Live Server)
// =====================
app.use(
  cors({
    origin: true, // reflect request origin
    credentials: true
  })
);

// =============================
// Basic Middleware
// =============================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =============================
// Simple password (change it!)
// =============================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// =============================
// File for storing posts
// =============================
const POSTS_FILE = path.join(__dirname, "posts.json");

// =============================
// Multer setup for file uploads
// =============================
// Ensure uploads folder exists: /public/uploads
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });


// Read posts helper
function readPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  const data = fs.readFileSync(POSTS_FILE, "utf8");
  return data ? JSON.parse(data) : [];
}

// Write posts helper
function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// =============================
// GET: All posts
// =============================
app.get("/api/posts", (req, res) => {
  const posts = readPosts();

  // sort by newest (descending)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(posts);
});

// =============================
// POST: Create new post (admin, with images)
// =============================
app.post("/api/posts", upload.array("images", 10), (req, res) => {
  const { adminPassword, title, category, content, affiliateLink } = req.body;

  // authentication
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // validation
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const posts = readPosts();

  // Uploaded image files → URLs front-end can use
  const imageUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);

  const newPost = {
    id: Date.now(),
    title,
    category: category || "",
    content,
    images: imageUrls,                     // array of images
    imageUrl: imageUrls[0] || "",          // keep first one for compatibility
    affiliateLink: affiliateLink || "",
    date: new Date().toISOString()
  };

  posts.push(newPost);
  writePosts(posts);

  res.json({ success: true, post: newPost });
});



// =============================
// UPDATE an existing post (admin, optional new images)
// =============================
app.put("/api/posts/:id", upload.array("images", 10), (req, res) => {
  const postId = Number(req.params.id);
  const { adminPassword, title, category, content, affiliateLink } = req.body;

  // authentication
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // validation
  if (!title || !content) {
    return res
      .status(400)
      .json({ error: "Title and content are required" });
  }

  let posts = readPosts();
  const idx = posts.findIndex((p) => p.id === postId);

  if (idx === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const existingPost = posts[idx];

  const newImageUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);

  // If new images uploaded, replace; otherwise keep old ones
  const finalImages =
    newImageUrls.length > 0 ? newImageUrls : (existingPost.images || []);
  const finalImageUrl =
    newImageUrls.length > 0
      ? newImageUrls[0]
      : (existingPost.imageUrl || (existingPost.images && existingPost.images[0]) || "");

  posts[idx] = {
    ...existingPost,
    title,
    category,
    content,
    affiliateLink,
    images: finalImages,
    imageUrl: finalImageUrl,
    updatedAt: new Date().toISOString()
  };

  writePosts(posts);
  res.json({ success: true, post: posts[idx] });
});





// =============================
// DELETE: Delete a post (admin)
// =============================
app.delete("/api/posts/:id", (req, res) => {
  const { adminPassword } = req.body;
  const postId = Number(req.params.id);

  // authentication
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let posts = readPosts();
  const originalLength = posts.length;

  posts = posts.filter((p) => p.id !== postId);

  if (posts.length === originalLength) {
    return res.status(404).json({ error: "Post not found" });
  }

  writePosts(posts);
  res.json({ success: true });
});

// =============================
// Start the server
// =============================
app.listen(PORT, () => {
  console.log(`Sean's Hub running at http://localhost:${PORT}`);
});


