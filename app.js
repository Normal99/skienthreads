import {
  registrerBruker,
  loggInn,
  loggUt,
  overvåkBruker,
  leggTilDokument,
  visDokumenterLive,
  hentDokumenter,
  hentSkole,
  toggleLike
} from "./utils.js";


let sortThreadsBy = "recent"; // or "popular"


// ============================================
// post thread functionality
// ============================================

document.getElementById("post-thread").addEventListener("submit", async (e) => {
  e.preventDefault(); // 🚀 stop page reload

  const content = e.target.querySelector("textarea").value;
  
  overvåkBruker(async (user) => { // make this callback async
    if (!user) {
      alert("Du må være logget inn for å poste!");
      return;
    }
    if (!content.trim()) {
      alert("Tråden kan ikke være tom!");
      return;
    }

    const school = await hentSkole(user.uid); // ✅ await the async function
    console.log(school);
    
    leggTilDokument("Threads", {
      content: content,
      authorId: user.uid,
      authorName: user.displayName || "Anonym",
      createdAt: new Date(),
      school: school,
      likes: []
    })
    .then(() => {
      e.target.reset();
      alert("Tråd postet!");
    });
  });
});



// ============================================
// show threads live
// ============================================

function timeAgo(timestamp) {
  const now = new Date();
  const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now - postDate;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return years + (years === 1 ? " år siden" : " år siden");
  if (months > 0) return months + (months === 1 ? " måned siden" : " måneder siden");
  if (days > 0) return days + (days === 1 ? " dag siden" : " dager siden");
  if (hours > 0) return hours + (hours === 1 ? " time siden" : " timer siden");
  if (minutes > 0) return minutes + (minutes === 1 ? " minutt siden" : " minutter siden");
  return "Nå nettopp";
}

function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function like(threadid){
  overvåkBruker((user) => {
    toggleLike(threadid, user.uid)
  })

}

function visTråderLive() {
  const container = document.getElementById("Threads");

  let currentUser = null;
  overvåkBruker(user => currentUser = user); // store current user for rendering

  visDokumenterLive("Threads", (docs) => {
    container.innerHTML = ""; // clear current posts

    docs.sort((a, b) => {
      if (sortThreadsBy === "recent") {
        return b.createdAt.toMillis() - a.createdAt.toMillis(); // newest first
      } else if (sortThreadsBy === "popular") {
        const likesA = a.likes ? a.likes.length : 0;
        const likesB = b.likes ? b.likes.length : 0;
        return likesB - likesA; // most liked first
      }
    });

    docs.forEach((data) => {
        const postEl = document.createElement("div");
        postEl.classList.add("thread-card");

        const initials = getInitials(data.authorName);
        const userLiked = currentUser && data.likes && data.likes.includes(currentUser.uid);

        postEl.innerHTML = `
          <div class="thread-header">
            <div class="user-avatar">${initials}</div>
            <div class="thread-user-info">
              <div class="thread-username">${data.authorName}</div>
              <div class="thread-meta">
                ${timeAgo(data.createdAt)}
                <span class="thread-school-badge">${data.school}</span>
              </div>
            </div>
          </div>
          <div class="thread-content">
            ${data.content}
          </div>
          <div class="thread-actions">
            <button class="action-btn like">
              <span>${userLiked ? "❤️" : "🤍"}</span>
              <span>${data.likes ? data.likes.length : 0}</span>
            </button>
            <button class="action-btn comment">
              <span>💬</span>
              <span>${data.comments ? data.comments.length : 0}</span>
            </button>
          </div>
        `;

        container.appendChild(postEl);

        // Attach click listener for like
        const likeBtn = postEl.querySelector(".action-btn.like");
        likeBtn.addEventListener("click", () => {
          if (!currentUser) {
            alert("Du må være logget inn for å like!");
            return;
          }
          toggleLike(data.id, currentUser.uid); // Firestore updates, live listener re-renders UI
        });
      });
  });
}







// ============================================
// REGISTER FORM HANDLER
// ============================================

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // 🚀 stop page reload

  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const name = document.getElementById("regName").value;
  const school = document.getElementById("regSchool").value;

  try {
    await registrerBruker(email, pass, name, school);
    alert("Bruker opprettet, sjekk skole-eposten din!");
  } catch (err) {
    alert("Feil: " + err.message);
    console.error(err);
  }
});

// ============================================
// LOGIN FORM HANDLER
// ============================================
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // 🚀 stop page reload

  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;
  
  try {
    const user = await loggInn(email, pass);
    alert("Logget inn!");
    // After successful login, show main page
    showMainPage();
  } catch (err) {
    alert("Feil: " + err.message);
  }
});

// ============================================
// AUTH STATE MONITORING
// React to authentication changes
// ============================================
overvåkBruker((user) => {
  if (user) {
    console.log("Innlogget:", user.email, "Verifisert:", user.emailVerified);
    
    // If user is logged in and verified, show main page
    if (user.emailVerified) {
      showMainPage();
    } else {
      // User logged in but not verified, keep on auth screen
      console.log("Vennligst verifiser eposten din");
    }
  } else {
    console.log("Ikke logget inn");
    showLogin();
  }
});

// ============================================
// SCREEN NAVIGATION FUNCTIONS
// ============================================

// Show register screen
function showRegister() {
  document.getElementById("register-screen").classList.remove("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-page").classList.add("hidden");
  document.getElementById("main-content").classList.add("hidden");
}

// Show login screen
function showLogin() {
  document.getElementById("register-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("main-page").classList.add("hidden");
  document.getElementById("main-content").classList.add("hidden");
}

// Show main threads page
function showMainPage() {
  document.getElementById("register-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-page").classList.remove("hidden");
  document.getElementById("main-content").classList.remove("hidden");
}

// ============================================
// TOGGLE BETWEEN LOGIN/REGISTER
// ============================================
document.getElementById("go-to-login").addEventListener("click", showLogin);
document.getElementById("go-to-register").addEventListener("click", showRegister);

// ============================================
// LOGOUT FUNCTIONALITY
// Add this when user clicks profile button or logout
// ============================================
// Example: Add logout to profile button (you can customize this)
document.querySelector(".profile-btn").addEventListener("click", () => {
  const confirmLogout = confirm("Vil du logge ut?");
  if (confirmLogout) {
    loggUt();
    showLogin();
  }
});

// ============================================ show name in profile ============================================ //
overvåkBruker((user) => {
  if (user) {
    let displayName = user.displayName || "Bruker";
    //document.getElementById("profileName").textContent = displayName;
    let initals_els = document.querySelectorAll(".initials");
    initals_els.forEach(el => el.textContent = displayName.split(" ").map(n => n[0]).join("").toUpperCase());
  }
});


// ==========================================
// switch between recent and popular search

document.getElementById("popular").addEventListener("click", () => {
  sortThreadsBy = "popular"

  const recent = document.getElementById("nylig")
  recent.classList.remove("active")

  const popular = document.getElementById("popular")
  popular.classList.add("active")
  visTråderLive()
})

document.getElementById("nylig").addEventListener("click", () => {
  sortThreadsBy = "recent"

  const recent = document.getElementById("nylig")
  recent.classList.add("active")

  const popular = document.getElementById("popular")
  popular.classList.remove("active")
  visTråderLive()
})

visTråderLive()
