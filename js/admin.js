import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { signOut } from
"https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const auth = getAuth();
const ADMIN_EMAIL = "hot-internalcontrol@myecurrencyng.com";

// ---------------- DOM ----------------
const adminAuthSection = document.getElementById("admin-auth");
const adminDashboard = document.getElementById("admin-dashboard");

const adminLoginForm = document.getElementById("admin-login-form");
const adminEmailInput = document.getElementById("admin-email");
const adminAuthMessage = document.getElementById("admin-auth-message");

const randomizeBtn = document.getElementById("randomize-btn");
const newCycleBtn = document.getElementById("new-cycle-btn");

const alphabetEditor = document.getElementById("alphabet-editor");
const submissionsTableBody =
  document.querySelector("#submissions-table tbody");

// ---------------- STATE ----------------
let currentCycleId = null;
let unsubscribeSubmissions = null;

// ---------------- AUTH ----------------
adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = adminEmailInput.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, "admin1234");
  } catch (err) {
    adminAuthMessage.textContent = err.message;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  if (user.email !== ADMIN_EMAIL) {
    alert("❌ You are not authorized as admin.");
    await signOut(auth);
    location.reload();
    return;
  }

  adminAuthSection.hidden = true;
  adminDashboard.hidden = false;

  await loadAdminConfig();
  await loadAlphabetEditor();
  listenToSubmissions();
});


// ---------------- LOAD CURRENT CYCLE ----------------
async function loadAdminConfig() {
  const ref = doc(db, "admin", "config");
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  currentCycleId = snap.data().currentCycleId;
}

// ---------------- NEW CYCLE ----------------
newCycleBtn.addEventListener("click", async () => {
  // create cycle
  const cycleRef = doc(collection(db, "cycles"));
  const cycleId = cycleRef.id;

  await setDoc(cycleRef, {
    createdAt: serverTimestamp()
  });

  // update admin config
  await setDoc(doc(db, "admin", "config"), {
    currentCycleId: cycleId,
    updatedAt: serverTimestamp()
  });

  currentCycleId = cycleId;

  // create A–Z boxes
  const letters = "ABCDEFGHIJ".split("");
  const boxesRef = collection(db, "cycles", cycleId, "boxes");

  for (const letter of letters) {
    await setDoc(doc(boxesRef), {
      alphabet: letter,
      picked: false
    });
  }

  alphabetEditor.innerHTML = "";
  await loadAlphabetEditor();

  // 🔑 reset submissions listener
  submissionsTableBody.innerHTML = "";
  if (unsubscribeSubmissions) unsubscribeSubmissions();
  listenToSubmissions();

  alert("✅ New cycle created");
});

// ---------------- RANDOMIZE ----------------
randomizeBtn.addEventListener("click", async () => {
  if (!currentCycleId) return;

  const boxesRef = collection(
    db,
    "cycles",
    currentCycleId,
    "boxes"
  );

  const snap = await getDocs(boxesRef);
  const boxes = snap.docs;

  const shuffled = boxes
    .map(b => b.data().alphabet)
    .sort(() => Math.random() - 0.5);

  let i = 0;
  for (const b of boxes) {
    await updateDoc(b.ref, {
      alphabet: shuffled[i++]
    });
  }

  alert("🔀 Alphabets randomized");
});

// ---------------- ALPHABET EDITOR ----------------
async function loadAlphabetEditor() {
  if (!currentCycleId) return;

  alphabetEditor.innerHTML = "";

  const boxesRef = collection(
    db,
    "cycles",
    currentCycleId,
    "boxes"
  );

  const snap = await getDocs(boxesRef);

  snap.forEach((docSnap) => {
    const data = docSnap.data();

    const input = document.createElement("input");
    input.value = data.alphabet;
    input.maxLength = 1;
    input.disabled = data.picked === true;

    input.addEventListener("input", async () => {
      await updateDoc(docSnap.ref, {
        alphabet: input.value.toUpperCase()
      });
    });

    alphabetEditor.appendChild(input);
  });
}

// ---------------- SUBMISSIONS TABLE ----------------
function listenToSubmissions() {
  if (!currentCycleId) return;

  const q = query(
    collection(db, "submissions"),
    where("cycleId", "==", currentCycleId)
  );

  unsubscribeSubmissions = onSnapshot(q, (snapshot) => {
    submissionsTableBody.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.email}</td>
        <td>${d.alphabet}</td>
        <td>${d.createdAt?.toDate?.().toLocaleString() || ""}</td>
      `;

      submissionsTableBody.appendChild(tr);
    });
  });
}
document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    location.reload();
});
