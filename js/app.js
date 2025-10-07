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
import explainWithServer from './aiExplain.js';

let tags = new Set();
let currentUser = null;
let editingId = null;

const codeInput = document.getElementById('codeInput');
const titleInput = document.getElementById('titleInput');
const langSelect = document.getElementById('langSelect');
const tagInput = document.getElementById('tagInput');
const tagList = document.getElementById('tagList');
const libList = document.getElementById('libList');
const runFrame = document.getElementById('runFrame');
const errorCount = document.getElementById('errorCount');
const explainBox = document.getElementById('explainBox');

document.getElementById('saveBtn').addEventListener('click', saveSnippet);
document.getElementById('clearBtn').addEventListener('click', clearEditor);
document.getElementById('copyBtn').addEventListener('click', copyCode);
document.getElementById('runBtn').addEventListener('click', runSnippet);
document.getElementById('explainBtn').addEventListener('click', explainErrors);
document.getElementById('signInBtn').addEventListener('click', googleSignIn);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('searchInput').addEventListener('input', renderLibrary);
document.getElementById('newBtn').addEventListener('click', () => showView('new'));
document.getElementById('libraryBtn').addEventListener('click', () => showView('lib'));
document.getElementById('mySnippetsBtn').addEventListener('click', () => showView('mine'));

tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && tagInput.value.trim()) {
    tags.add(tagInput.value.trim());
    tagInput.value = '';
    renderTags();
  }
});

codeInput.addEventListener('input', () => {
  analyzeCode(codeInput.value);
});

function showView(view) {
  document.querySelectorAll('.nav button').forEach((b) => b.classList.remove('active'));
  if (view === 'new') document.getElementById('newBtn').classList.add('active');
  if (view === 'lib') document.getElementById('libraryBtn').classList.add('active');
  if (view === 'mine') document.getElementById('mySnippetsBtn').classList.add('active');
  renderLibrary();
}

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

function copyCode() {
  navigator.clipboard.writeText(codeInput.value).then(() => alert('Copied to clipboard'));
}

function clearEditor() {
  titleInput.value = '';
  codeInput.value = '';
  tags.clear();
  renderTags();
  editingId = null;
  explainBox.style.display = 'none';
}

function analyzeCode(src) {
  if (!src) {
    errorCount.textContent = '0';
    return;
  }
  try {
    const parsed = esprima.parseScript(src, { tolerant: true });
    const errors = parsed.errors || [];
    errorCount.textContent = errors.length;
  } catch (e) {
    errorCount.textContent = '1';
  }
}

async function explainErrors() {
  const src = codeInput.value;
  if (!src) {
    explainBox.style.display = "block";
    explainBox.textContent = "No code to analyze.";
    return;
  }

  explainBox.style.display = "block";
  explainBox.textContent = "Thinking...";

  try {
    const resp = await explainWithServer(src);
    explainBox.textContent = resp.explanation;
  } catch (e) {
    explainBox.textContent = "Explain failed: " + e.message;
  }
}

function runSnippet() {
  const lang = langSelect.value;
  const code = codeInput.value;

  if (lang === 'javascript') {
    const prefix = `<!doctype html><html><body><script>try {`;
    const suffix = `} catch(e) { document.body.innerText = "Runtime error: " + e.message; }</script></body></html>`;
    runFrame.srcdoc = prefix + code + suffix;
  } else if (lang === 'html') {
    runFrame.srcdoc = code;
  } else {
    runFrame.srcdoc = `<pre style="color:#e6eef8;background:#08121a;padding:12px">Running for ${lang} is not supported in this sandbox.</pre>`;
  }
}

async function saveSnippet() {
  if (!currentUser) {
    alert('Please sign in to save snippets');
    return;
  }

  const title = titleInput.value || 'Untitled';
  const content = codeInput.value || '';
  const lang = langSelect.value;
  const isPublic = document.getElementById('publicToggle').checked;

  const snippet = {
    title,
    content,
    lang,
    tags: Array.from(tags),
    owner: currentUser.uid,
    ownerName: currentUser.displayName || 'Anon',
    public: isPublic,
    createdAt: serverTimestamp()
  };

  try {
    if (editingId) {
      const d = doc(db, 'snippets', editingId);
      await updateDoc(d, snippet);
      alert('Updated snippet');
    } else {
      await addDoc(collection(db, 'snippets'), snippet);
      alert('Saved snippet');
    }
    clearEditor();
    renderLibrary();
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
}

async function renderLibrary() {
  libList.innerHTML = '';
  const qText = document.getElementById('searchInput').value.trim().toLowerCase();
  const q = query(collection(db, 'snippets'), orderBy('createdAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const filtered = docs.filter((s) => {
    if (document.getElementById('mySnippetsBtn').classList.contains('active')) {
      return currentUser && s.owner === currentUser.uid;
    }
    if (document.getElementById('libraryBtn').classList.contains('active')) {
      return s.public;
    }
    if (document.getElementById('newBtn').classList.contains('active')) return true;
    if (qText) {
      return (
        (s.title && s.title.toLowerCase().includes(qText)) ||
        (s.tags && s.tags.join(' ').toLowerCase().includes(qText)) ||
        (s.lang && s.lang.toLowerCase().includes(qText))
      );
    }
    return s.public || (currentUser && s.owner === currentUser.uid);
  });

  filtered.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'snippet-card';

    const h = document.createElement('h3');
    h.textContent = s.title || 'Untitled';
    card.appendChild(h);

    const m = document.createElement('div');
    m.className = 'snippet-meta';
    m.innerHTML = `<div class='muted-small'>${s.lang}</div><div class='muted-small'>by ${s.ownerName || 'Anon'}</div>`;
    card.appendChild(m);

    const pre = document.createElement('pre');
    pre.style.marginTop = '8px';
    pre.innerHTML = `<code class='language-${s.lang}'>${escapeHtml(s.content).substring(0, 600)}</code>`;
    card.appendChild(pre);

    const actions = document.createElement('div');
    actions.style.marginTop = '8px';
    actions.className = 'row';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn secondary';
    viewBtn.textContent = 'Load';
    viewBtn.onclick = () => loadSnippetIntoEditor(s);

    const forkBtn = document.createElement('button');
    forkBtn.className = 'btn';
    forkBtn.textContent = 'Fork';
    forkBtn.onclick = () => forkSnippet(s);

    actions.appendChild(viewBtn);
    actions.appendChild(forkBtn);
    card.appendChild(actions);

    libList.appendChild(card);
    Prism.highlightElement(pre.querySelector('code'));
  });
}

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function loadSnippetIntoEditor(s) {
  titleInput.value = s.title;
  codeInput.value = s.content;
  langSelect.value = s.lang || 'javascript';
  tags = new Set(s.tags || []);
  renderTags();
  editingId = s.id;
  analyzeCode(s.content);
  explainBox.style.display = 'none';
}

async function forkSnippet(s) {
  if (!currentUser) {
    alert('Sign in to fork');
    return;
  }

  const copy = {
    ...s,
    title: s.title + ' (fork)',
    owner: currentUser.uid,
    ownerName: currentUser.displayName,
    public: false,
    createdAt: serverTimestamp()
  };

  delete copy.id;

  try {
    await addDoc(collection(db, 'snippets'), copy);
    alert('Forked into your snippets');
    renderLibrary();
  } catch (e) {
    alert(e.message);
  }
}

async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      currentUser = result.user;
      onAuthChange(currentUser);
    })
    .catch((e) => alert(e.message));
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

  renderLibrary();
}

onAuthStateChanged(auth, (u) => {
  if (u) onAuthChange(u);
  else onAuthChange(null);
});

function renderTags() {
  tagList.innerHTML = '';
  Array.from(tags).forEach((t) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.textContent = t;
    el.onclick = () => {
      tags.delete(t);
      renderTags();
    };
    tagList.appendChild(el);
  });
}

renderLibrary();

const sections = document.querySelectorAll('.section');
const navButtons = document.querySelectorAll('.nav button');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target');

    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    sections.forEach(sec => sec.classList.add('hidden'));
    document.getElementById(target).classList.remove('hidden');
  });
});

