import {
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  limit
} from './firebase.js';

let currentUser = null;

const codeInput = document.getElementById('codeInput');
const runFrame = document.getElementById('runFrame');
const saveBtn = document.getElementById('saveBtn');
const publishPublic = document.getElementById('publishPublic');
const saveToProfile = document.getElementById('saveToProfile');
const rightPanel = document.getElementById('rightPanel');
const libList = document.getElementById('libList');

const navButtons = document.querySelectorAll('.nav button');
const sections = document.querySelectorAll('.section');

saveBtn.addEventListener('click', saveSnippet);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('signInBtn').addEventListener('click', googleSignIn);
document.getElementById('searchInput').addEventListener('input', renderLibrary);

// Navigation system
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target');
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    sections.forEach(sec => sec.classList.add('hidden'));
    document.getElementById(target).classList.remove('hidden');

    // Show/hide right panel
    if (target === 'publicLibrary') {
      rightPanel.classList.remove('hidden');
      renderLibrary();
    } else {
      rightPanel.classList.add('hidden');
    }
  });
});

function toggleTheme() {
  document.documentElement.classList.toggle('light');
  if (document.documentElement.classList.contains('light')) {
    document.body.style.background = 'linear-gradient(180deg,#f7fbff,#e6eef8)';
    document.body.style.color = '#0b1220';
  } else {
    document.body.style.background = 'linear-gradient(180deg,#02040a,#0b0f14)';
    document.body.style.color = '#e6eef8';
  }
}

function runSnippet() {
  const code = codeInput.value;
  const prefix = `<!doctype html><html><body><script>try {`;
  const suffix = `} catch(e) { document.body.innerText = "Runtime error: " + e.message; }</script></body></html>`;
  runFrame.srcdoc = prefix + code + suffix;
}

async function saveSnippet() {
  if (!currentUser) {
    alert('Please sign in first.');
    return;
  }

  const content = codeInput.value.trim();
  if (!content) {
    alert('Cannot save empty code.');
    return;
  }

  const snippet = {
    title: 'Untitled Snippet',
    content,
    lang: 'javascript',
    owner: saveToProfile.checked ? currentUser.uid : 'anonymous',
    ownerName: currentUser.displayName || 'Anon',
    public: publishPublic.checked,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'snippets'), snippet);
    alert('Snippet saved!');
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
}

async function renderLibrary() {
  libList.innerHTML = '';
  const q = query(collection(db, 'snippets'), orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const s = docSnap.data();
    if (!s.public) return;

    const card = document.createElement('div');
    card.className = 'snippet-card';
    card.innerHTML = `
      <h3>${s.title}</h3>
      <div class="snippet-meta muted-small">${s.lang} • by ${s.ownerName}</div>
      <pre style="margin-top:8px;"><code class="language-javascript">${escapeHtml(s.content.substring(0, 400))}</code></pre>
    `;
    libList.appendChild(card);
    Prism.highlightElement(card.querySelector('code'));
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    onAuthChange(currentUser);
  } catch (e) {
    alert(e.message);
  }
}

function onAuthChange(user) {
  currentUser = user;
  const authArea = document.getElementById('authArea');
  authArea.innerHTML = '';

  if (user) {
    const img = document.createElement('img');
    img.src = user.photoURL;
    img.style.width = '36px';
    img.style.height = '36px';
    img.style.borderRadius = '6px';
    img.style.marginRight = '8px';

    const name = document.createElement('span');
    name.textContent = user.displayName;
    name.style.marginRight = '8px';

    const out = document.createElement('button');
    out.className = 'btn secondary';
    out.textContent = 'Sign out';
    out.onclick = () => signOut(auth);

    authArea.appendChild(img);
    authArea.appendChild(name);
    authArea.appendChild(out);
  } else {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Sign in with Google';
    btn.onclick = googleSignIn;
    authArea.appendChild(btn);
  }
}

onAuthStateChanged(auth, (u) => {
  if (u) onAuthChange(u);
  else onAuthChange(null);
});
