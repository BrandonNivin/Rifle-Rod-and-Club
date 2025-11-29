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

function mapDbPost(row) {
  // Normalize images from jsonb (or string, just in case)
  let images = [];
  if (Array.isArray(row.images)) {
    images = row.images;
  } else if (typeof row.images === "string" && row.images.trim() !== "") {
    try {
      images = JSON.parse(row.images);
    } catch (_) {
      images = [];
    }
  }

  const createdAt = row.created_at || row.date; // in case of naming differences
  const updatedAt = row.updated_at || null;

  return {
    id: row.id,
    title: row.title,
    category: row.category || "",
    content: row.content,
    images,
    imageUrl: row.image_url || (images[0] || ""),
    affiliateLink: row.affiliate_link || "",
    date: createdAt ? new Date(createdAt).toISOString() : null,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
}


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
// Multer setup for file uploads
// =============================

// In production (Render), we'll set UPLOADS_DIR to a path on a persistent disk.
// Locally, it will default to /public/uploads.
const UPLOADS_ROOT =
  process.env.UPLOADS_DIR || path.join(__dirname, "public", "uploads");

if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_ROOT);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Serve /uploads paths from the correct folder
app.use("/uploads", express.static(UPLOADS_ROOT));


// =============================
// GET: All posts
// =============================
app.get("/api/posts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, category, content, images, image_url,
              affiliate_link, created_at, updated_at
       FROM posts
       ORDER BY created_at DESC`
    );

    const posts = result.rows.map(mapDbPost);
    res.json(posts);
  } catch (err) {
    console.error("Error fetching posts from DB:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});


// =============================
// POST: Create new post (admin, with images)
// =============================
app.post("/api/posts", upload.array("images", 10), async (req, res) => {
  const { adminPassword, title, category, content, affiliateLink } = req.body;

  // authentication
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // validation
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  try {
    // Uploaded image files → URLs front-end can use
    const imageUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const imagesJson = JSON.stringify(imageUrls);
    const mainImage = imageUrls[0] || "";

    const result = await pool.query(
      `INSERT INTO posts (title, category, content, images, image_url, affiliate_link)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, category, content, images, image_url,
                 affiliate_link, created_at, updated_at`,
      [title, category || "", content, imagesJson, mainImage, affiliateLink || ""]
    );

    const post = mapDbPost(result.rows[0]);

    res.json({ success: true, post });
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// =============================
// UPDATE an existing post (admin, optional new images)
// =============================
app.put("/api/posts/:id", upload.array("images", 10), async (req, res) => {
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

  try {
    // load existing post
    const existingResult = await pool.query(
      `SELECT id, title, category, content, images, image_url,
              affiliate_link, created_at, updated_at
       FROM posts
       WHERE id = $1`,
      [postId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existing = existingResult.rows[0];

    // normalize existing images
    let existingImages = [];
    if (Array.isArray(existing.images)) {
      existingImages = existing.images;
    } else if (typeof existing.images === "string" && existing.images.trim() !== "") {
      try {
        existingImages = JSON.parse(existing.images);
      } catch (_) {
        existingImages = [];
      }
    }

    // new uploaded images
    const newImageUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);

    // If new images uploaded, replace; otherwise keep old ones
    const finalImages = newImageUrls.length > 0 ? newImageUrls : existingImages;

    const finalImageUrl =
      newImageUrls.length > 0
        ? newImageUrls[0]
        : (existing.image_url || (existingImages[0] || ""));

    const updatedAt = new Date();
    const imagesJson = JSON.stringify(finalImages);

    const updateResult = await pool.query(
      `UPDATE posts
       SET title = $1,
           category = $2,
           content = $3,
           affiliate_link = $4,
           images = $5,
           image_url = $6,
           updated_at = $7
       WHERE id = $8
       RETURNING id, title, category, content, images, image_url,
                 affiliate_link, created_at, updated_at`,
      [
        title,
        category || "",
        content,
        affiliateLink || "",
        imagesJson,
        finalImageUrl,
        updatedAt,
        postId,
      ]
    );

    const updatedPost = mapDbPost(updateResult.rows[0]);
    res.json({ success: true, post: updatedPost });
  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// =============================
// DELETE: Delete a post (admin)
// =============================
app.delete("/api/posts/:id", async (req, res) => {
  const { adminPassword } = req.body;
  const postId = Number(req.params.id);

  // authentication
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM posts WHERE id = $1 RETURNING id",
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});


// =============================
// Start the server
// =============================
app.listen(PORT, () => {
  console.log(`Sean's Hub running at http://localhost:${PORT}`);
});


