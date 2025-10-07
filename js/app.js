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
  where,
  getDocs,
  serverTimestamp,
  limit
} from './firebase.js';

let currentUser = null;

const codeInput = document.getElementById('codeInput');
const runFrame = document.getElementById('runFrame');
const saveBtn = document.getElementById('saveBtn');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const publishPublic = document.getElementById('publishPublic');
const saveToProfile = document.getElementById('saveToProfile');
const libList = document.getElementById('libList');
const mySnippetsList = document.getElementById('mySnippetsList');
const signOutBtn = document.getElementById('signOutBtn');
const searchInput = document.getElementById('searchInput');

const langSelect = document.getElementById('langSelect');
const errorBox = document.getElementById('errorBox');

if (codeInput) {
  codeInput.addEventListener('input', () => analyzeCode());
  langSelect.addEventListener('change', () => analyzeCode());
}

function analyzeCode() {
  const code = codeInput.value.trim();
  const lang = langSelect.value;
  if (!code) {
    errorBox.classList.add('hidden');
    codeInput.classList.remove('error');
    return;
  }

  try {
    if (lang === 'javascript') {
      const result = esprima.parseScript(code, { tolerant: true });
      if (result.errors && result.errors.length) {
        const e = result.errors[0];
        showError(`⚠️ JavaScript Error at line ${e.lineNumber}: ${e.description}`);
      } else hideError();
    } else if (lang === 'html') {
      const messages = HTMLHint.verify(code);
      if (messages.length) {
        const msg = messages[0];
        showError(`⚠️ HTML Issue at line ${msg.line}: ${msg.message}`);
      } else hideError();
    } else if (lang === 'css') {
      const result = CSSLint.verify(code);
      if (result.messages.length) {
        const m = result.messages[0];
        showError(`⚠️ CSS Issue at line ${m.line}: ${m.message}`);
      } else hideError();
    } else if (lang === 'python') {
      try {
        Sk.importMainWithBody('<stdin>', false, code);
        hideError();
      } catch (err) {
        showError(`⚠️ Python Error: ${err.toString().split('\n')[0]}`);
      }
    }
  } catch (err) {
    showError(`⚠️ Syntax Error: ${err.message}`);
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  codeInput.classList.add('error');
}

function hideError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
  codeInput.classList.remove('error');
}

if (saveBtn) saveBtn.addEventListener('click', saveSnippet);
if (runBtn) runBtn.addEventListener('click', runSnippet);
if (clearBtn) clearBtn.addEventListener('click', clearEditor);
if (signOutBtn) signOutBtn.addEventListener('click', () => signOut(auth));
if (searchInput) searchInput.addEventListener('input', renderLibrary);

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (window.location.pathname.endsWith('my-snippets.html')) await renderMySnippets();
  if (window.location.pathname.endsWith('library.html')) await renderLibrary();
  updateProfileUI();
});

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
    alert('Snippet saved successfully.');
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
}

function runSnippet() {
  const code = codeInput.value;
  const html = `<!doctype html><html><body><script>try{${code}}catch(e){document.body.innerText='Runtime error: '+e.message}</script></body></html>`;
  runFrame.srcdoc = html;
}

function clearEditor() {
  codeInput.value = '';
  runFrame.srcdoc = '';
}

async function renderLibrary() {
  libList.innerHTML = '';
  const search = searchInput.value.trim().toLowerCase();
  const q = query(collection(db, 'snippets'), orderBy('createdAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  let found = false;
  snapshot.forEach(docSnap => {
    const s = docSnap.data();
    if (!s.public) return;
    if (search && !s.title.toLowerCase().includes(search) && !(s.ownerName || '').toLowerCase().includes(search)) return;
    const card = document.createElement('div');
    card.className = 'snippet-card';
    card.innerHTML = `
      <h3>${s.title}</h3>
      <div class="snippet-meta muted-small">${s.lang} • by ${s.ownerName}</div>
      <pre style="margin-top:8px;"><code class="language-javascript">${escapeHtml(s.content.substring(0, 400))}</code></pre>
    `;
    libList.appendChild(card);
    Prism.highlightElement(card.querySelector('code'));
    found = true;
  });
  if (!found) libList.innerHTML = "<p class='muted'>No snippets found.</p>";
}

async function renderMySnippets() {
  mySnippetsList.innerHTML = '';
  if (!currentUser) {
    mySnippetsList.innerHTML = "<p class='muted'>Please sign in to view your snippets.</p>";
    return;
  }
  const q = query(collection(db, 'snippets'), where('owner', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    mySnippetsList.innerHTML = "<p class='muted'>You haven't saved any snippets yet.</p>";
    return;
  }
  snapshot.forEach(docSnap => {
    const s = docSnap.data();
    const card = document.createElement('div');
    card.className = 'snippet-card';
    card.innerHTML = `
      <h3>${s.title}</h3>
      <div class="snippet-meta muted-small">${s.lang} • ${s.public ? '🌍 Public' : '🔒 Private'}</div>
      <pre style="margin-top:8px;"><code class="language-javascript">${escapeHtml(s.content.substring(0, 400))}</code></pre>
    `;
    mySnippetsList.appendChild(card);
    Prism.highlightElement(card.querySelector('code'));
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

function updateProfileUI() {
  const authArea = document.getElementById('authArea');
  if (!authArea) return;
  authArea.innerHTML = '';
  if (currentUser) {
    const img = document.createElement('img');
    img.src = currentUser.photoURL;
    img.style.width = '36px';
    img.style.height = '36px';
    img.style.borderRadius = '6px';
    img.style.marginRight = '8px';
    const name = document.createElement('span');
    name.textContent = currentUser.displayName;
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

async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    updateProfileUI();
  } catch (e) {
    alert(e.message);
  }
}
