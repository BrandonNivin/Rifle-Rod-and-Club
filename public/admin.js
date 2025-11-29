// ===============================
// Element references
// ===============================
const API_BASE_URL = ""; // same origin
const form = document.getElementById("new-post-form");
const statusMessage = document.getElementById("statusMessage");
const postsList = document.getElementById("admin-posts");

let editingPostId = null;      // null = creating, not editing
let cachedPosts = [];          // store posts for edit mode

const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formHeading = document.getElementById("formHeading");


// ===============================
// Create or update a post (with file upload)
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const adminPassword = document.getElementById("adminPassword").value;
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const content = document.getElementById("content").value;
  const affiliateLink = document.getElementById("affiliateLink").value;
  const imagesInput = document.getElementById("images");   // <input type="file" multiple>

  if (!title || !content) {
    statusMessage.textContent = "Title and content are required.";
    return;
  }

  if (!adminPassword) {
    statusMessage.textContent = "Admin password is required.";
    return;
  }

  const isEditing = editingPostId !== null;
  statusMessage.textContent = isEditing ? "Updating post..." : "Publishing...";

  // Build FormData instead of JSON
  const formData = new FormData();
  formData.append("adminPassword", adminPassword);
  formData.append("title", title);
  formData.append("category", category);
  formData.append("content", content);
  formData.append("affiliateLink", affiliateLink);

  // Attach all selected image files (if any)
  if (imagesInput && imagesInput.files && imagesInput.files.length > 0) {
    for (let i = 0; i < imagesInput.files.length; i++) {
      formData.append("images", imagesInput.files[i]);  // field name must match multer config
    }
  }

  try {
    const url = isEditing
      ? `${API_BASE_URL}/api/posts/${editingPostId}`
      : `${API_BASE_URL}/api/posts`;

    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      body: formData        // ❗ no Content-Type header here – browser sets boundary
    });

    const data = await res.json();

    if (!res.ok) {
      statusMessage.textContent = "Error: " + (data.error || "Something went wrong");
    } else {
      statusMessage.textContent = isEditing ? "Post updated!" : "Post published!";

      if (isEditing) {
        exitEditMode();
      } else {
        form.reset();
      }

      loadAdminPosts(); // refresh list
    }
  } catch (err) {
    console.error(err);
    statusMessage.textContent = "Network error";
  }
});



// ===============================
// Load posts into admin list
// ===============================
async function loadAdminPosts() {
  if (!postsList) return;

  postsList.innerHTML = "<li>Loading posts...</li>";

  try {
    const res = await fetch(`${API_BASE_URL}/api/posts`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      postsList.innerHTML = "<li>Could not load posts.</li>";
      return;
    }

    const posts = await res.json();
    cachedPosts = posts;  // <--- add this line

    if (!Array.isArray(posts) || posts.length === 0) {
      postsList.innerHTML = "<li>No posts yet.</li>";
      return;
    }

    postsList.innerHTML = "";

    posts.forEach((post) => {
      const li = document.createElement("li");
      li.style.marginBottom = "8px";

      const dateStr = post.date ? new Date(post.date).toLocaleDateString() : "";

      li.innerHTML = `
        <strong>${post.title}</strong>
        ${dateStr ? ` (${dateStr})` : ""}
        ${post.category ? ` - ${post.category}` : ""}
        <button class="edit-post" data-id="${post.id}" style="margin-left:10px;">
          Edit
        </button>
        <button class="delete-post" data-id="${post.id}" style="margin-left:10px;">
          Delete
        </button>
      `;


      postsList.appendChild(li);
    });
  } catch (err) {
    postsList.innerHTML = "<li>Could not load posts (network error).</li>";
  }
}

// ===============================
// Edit mode helpers
// ===============================
function startEditMode(id) {
  const post = cachedPosts.find((p) => String(p.id) === String(id));
  if (!post) {
    alert("Could not find that post to edit.");
    return;
  }

  editingPostId = id;

  document.getElementById("title").value = post.title || "";
  document.getElementById("category").value = post.category || "";
  document.getElementById("content").value = post.content || "";
  document.getElementById("affiliateLink").value = post.affiliateLink || "";

  if (formHeading) formHeading.textContent = "Edit Post";
  if (submitButton) submitButton.textContent = "Save Changes";
  if (cancelEditButton) cancelEditButton.style.display = "inline-block";
}

function exitEditMode() {
  editingPostId = null;
  form.reset();
  statusMessage.textContent = "";
  if (formHeading) formHeading.textContent = "New Post";
  if (submitButton) submitButton.textContent = "Publish Post";
  if (cancelEditButton) cancelEditButton.style.display = "none";
}

// Cancel edit button
if (cancelEditButton) {
  cancelEditButton.addEventListener("click", () => {
    exitEditMode();
  });
}

// ===============================
// Edit button click
// ===============================
postsList.addEventListener("click", (e) => {
  if (!e.target.classList.contains("edit-post")) return;

  const id = e.target.getAttribute("data-id");
  startEditMode(id);
});

// ===============================
// Delete a post
// ===============================
postsList.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-post")) return;

  const id = e.target.getAttribute("data-id");
  const adminPassword = document.getElementById("adminPassword").value;

  if (!adminPassword) {
    alert("Enter the admin password first.");
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this post?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ adminPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      alert("Error: " + (data.error || "Could not delete post"));
    } else {
      loadAdminPosts(); // refresh list
    }
  } catch (err) {
    alert("Network error while deleting post.");
  }
});

// Load posts on page load
document.addEventListener("DOMContentLoaded", loadAdminPosts);
