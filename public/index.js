// index.js

const API_BASE_URL = ""; // same origin

// Load and display posts

async function loadPosts() {
  const container = document.getElementById("posts-container");
  if (!container) return; // Do nothing if this page doesn't have the container

  // Show a quick loading message
  container.innerHTML = "<p>Loading posts...</p>";

  try {
    const res = await fetch(`${API_BASE_URL}/api/posts`, {
      method: "GET",
      credentials: "include", // matches your CORS credentials: true
    });

    if (!res.ok) {
      container.innerHTML = `<p>Could not load posts (server error: ${res.status}).</p>`;
      return;
    }

    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      container.innerHTML = "<p>No posts yet. Check back soon.</p>";
      return;
    }

    // Clear out the loading message
    container.innerHTML = "";

    // Render each post
    posts.forEach((post) => {
      const article = document.createElement("article");
      article.classList.add("post");

      const date = post.date ? new Date(post.date).toLocaleDateString() : "";

      // -------------------------
      // Build image gallery HTML
      // -------------------------
      let imagesHTML = "";

      if (post.images && post.images.length > 0) {
        imagesHTML += `<div class="post-images">`;

        post.images.forEach((imgUrl) => {
          imagesHTML += `
            <img
              src="${API_BASE_URL}${imgUrl}"
              alt="${post.title || ""}"
              class="post-image"
            >
          `;
        });

        imagesHTML += `</div>`;
      } else if (post.imageUrl) {
        // Fallback for older posts that only have a single imageUrl
        imagesHTML += `
          <div class="post-images">
            <img
              src="${API_BASE_URL}${post.imageUrl}"
              alt="${post.title || ""}"
              class="post-image"
            >
          </div>
        `;
      }

      // -------------------------
      // Build the article HTML
      // -------------------------
      article.innerHTML = `
        <h3>${post.title || ""}</h3>
        <p class="post-meta">
          ${date ? `Posted on ${date}` : ""}
          ${post.category ? `${date ? " • " : ""} Category: ${post.category}` : ""}
        </p>

        ${imagesHTML}

        <p>${(post.content || "").replace(/\n/g, "<br>")}</p>

        ${
          post.affiliateLink
            ? `
          <p style="margin-top:10px;">
            <a href="${post.affiliateLink}"
               target="_blank"
               rel="noopener noreferrer"
               class="view-btn">
              View this item
            </a>
          </p>`
            : ""
        }
      `;

      container.appendChild(article);
    });
  } catch (err) {
    console.error("Error loading posts:", err);
    container.innerHTML = "<p>Could not load posts (network error).</p>";
  }
}

// Setup image lightbox functionality
function setupImageLightbox() {
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  // Close when clicking anywhere
  lightbox.addEventListener("click", () => {
    lightbox.style.display = "none";
    lightboxImg.src = "";
  });

  // Attach click listener to all post images
  document.querySelectorAll(".post-image").forEach((img) => {
    img.addEventListener("click", () => {
      lightboxImg.src = img.src;   // full-size image
      lightbox.style.display = "flex";
    });
  });
}


// Run when the page finishes loading
document.addEventListener("DOMContentLoaded", async () => {
  await loadPosts();
  setupImageLightbox();
});

