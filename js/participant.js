import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ---------------- DOM ----------------
const authSection = document.getElementById("authSection");
const raffleSection = document.getElementById("shiftSection");
const emailForm = document.getElementById("emailForm");
const emailInput = document.getElementById("participant-email");
const authMessage = document.getElementById("authMessage");

const boxGrid = document.getElementById("box-grid");
const submitBtn = document.getElementById("submit-selection");
const selectedAlphabetText = document.getElementById("selected-alphabet");
const raffleMessage = document.getElementById("raffle-message");

// ---------------- STATE ----------------
let currentCycleId = null;
let participantEmail = null;
let selectedBoxId = null;
let selectedAlphabet = null;

// ---------------- HELPERS ----------------
function sanitizeEmail(email) {
  return email.replace(/[@.]/g, "_");
}

function resetSelectionUI() {
  selectedBoxId = null;
  selectedAlphabet = null;
  selectedAlphabetText.textContent = "";
  submitBtn.disabled = true;
}

// ---------------- ALLOW LIST ----------------
async function checkIfEmailAllowed(email) {
  const id = sanitizeEmail(email);
  const ref = doc(db, "allowedParticipants", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    authMessage.textContent = "This email is not registered.";
    return false;
  }

  if (snap.data().active !== true) {
    authMessage.textContent = "This email has been disabled.";
    return false;
  }

  return true;
}

// ---------------- LOAD CYCLE ----------------
async function loadAdminConfig() {
  const ref = doc(db, "admin", "config");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Admin config not found");
  }

  currentCycleId = snap.data().currentCycleId;
  listenToBoxes();
}

// ---------------- PARTICIPANT CHECK ----------------
async function checkParticipantStatus() {
  const participantId = sanitizeEmail(participantEmail);
  const ref = doc(db, "participants", participantId);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().cycleId === currentCycleId) {
    authMessage.textContent = "You have already picked in this cycle.";
    return false;
  }

  return true;
}

// ---------------- BOX LISTENER ----------------

function listenToBoxes() {
  if (!currentCycleId) return;

  const boxesRef = collection(db, "cycles", currentCycleId, "boxes");

  onSnapshot(boxesRef, (snapshot) => {
    boxGrid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // 🚫 Do not render empty alphabets
      if (!data.alphabet || data.alphabet.trim() === "") return;

      const box = document.createElement("div");
      box.className = "box";

      // 🔐 HARD RESET (kills CSS + dataset leaks)
      box.textContent = "";
      box.removeAttribute("data-letter");
      box.style.color = "transparent";

      if (data.picked === true) {
        box.classList.add("disabled");
        box.style.pointerEvents = "none";
      }

      box.addEventListener("click", () => {
        if (data.picked || selectedBoxId) return;

        selectedBoxId = docSnap.id;
        selectedAlphabet = data.alphabet;

        document.querySelectorAll(".box").forEach((b) => {
          b.classList.add("disabled");
          b.style.pointerEvents = "none";
          b.textContent = "";
          b.style.color = "transparent";
        });

        box.classList.remove("disabled");
        box.classList.add("selected");
        box.style.pointerEvents = "auto";
        box.style.color = "#000"; // 👈 reveal
        box.textContent = selectedAlphabet;

        selectedAlphabetText.textContent =
          `Selected Alphabet: ${selectedAlphabet}`;

        submitBtn.disabled = false;
      });

      boxGrid.appendChild(box);
    });
  });
}



// ---------------- SUBMIT (TRANSACTION SAFE) ----------------
async function submitSelection() {
  if (!selectedBoxId || !selectedAlphabet) return;

  submitBtn.disabled = true;

  const participantId = sanitizeEmail(participantEmail);

  const boxRef = doc(
    db,
    "cycles",
    currentCycleId,
    "boxes",
    selectedBoxId
  );

  const participantRef = doc(db, "participants", participantId);
  const submissionRef = doc(collection(db, "submissions"));

  try {
    await runTransaction(db, async (transaction) => {
      const boxSnap = await transaction.get(boxRef);

      if (!boxSnap.exists()) {
        throw "Box does not exist";
      }

      if (boxSnap.data().picked === true) {
        throw "This box has already been picked";
      }

      transaction.update(boxRef, {
        picked: true,
        pickedBy: participantEmail
      });

      transaction.set(participantRef, {
        email: participantEmail,
        alphabet: selectedAlphabet,
        cycleId: currentCycleId,
        createdAt: serverTimestamp()
      });

      transaction.set(submissionRef, {
        email: participantEmail,
        alphabet: selectedAlphabet,
        boxId: selectedBoxId,
        cycleId: currentCycleId,
        createdAt: serverTimestamp()
      });
    });

    raffleMessage.textContent = "Submission successful";
  } catch (err) {
    alert(err);
    location.reload();
  }
}

// ---------------- EVENTS ----------------
emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  participantEmail = emailInput.value.trim().toLowerCase();
  authMessage.textContent = "Checking eligibility...";

  const emailAllowed = await checkIfEmailAllowed(participantEmail);
  if (!emailAllowed) return;

  await loadAdminConfig();

  const allowed = await checkParticipantStatus();
  if (!allowed) return;

  authSection.hidden = true;
  raffleSection.hidden = false;
  resetSelectionUI();
});

submitBtn.addEventListener("click", submitSelection);
