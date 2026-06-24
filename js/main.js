/* ============================================================
   MAIN — boot, HUD, nav, render loop
   ============================================================ */

let mx = window.innerWidth  / 2;
let my = window.innerHeight / 2;
let kaleido;

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  document.getElementById('boot-progress').style.width = '100%';
  setTimeout(() => {
    document.getElementById('boot').classList.add('hidden');
    revealUI();
  }, 2000);
}

function revealUI() {
  // UI hidden for now
}

// ── Nav nodes ────────────────────────────────────────────────
function buildNav() {
  const nav = document.getElementById('case-nav');
  nav.innerHTML = CASE_STUDIES.map((cs, i) => `
    <a class="cs-node" href="${cs.href}"
       onmouseenter="onNodeEnter(${i}, event)"
       onmouseleave="onNodeLeave()">
      <span class="cs-id">[${cs.id}]</span>
      <span class="cs-title">${cs.title}</span>
      <span class="cs-tag">${cs.tags.split('//')[0].trim()}</span>
    </a>
  `).join('');
}

function onNodeEnter(idx, e) {
  const cs = CASE_STUDIES[idx];
  const tt = document.getElementById('tooltip');
  document.getElementById('tt-id').textContent    = cs.id;
  document.getElementById('tt-title').textContent = cs.desc;
  document.getElementById('tt-tags').textContent  = cs.tags;
  tt.style.left = (e.clientX + 18) + 'px';
  tt.style.top  = (e.clientY - 50) + 'px';
  tt.setAttribute('aria-hidden', 'false');
  tt.classList.add('show');
}
function onNodeLeave() {
  const tt = document.getElementById('tooltip');
  tt.classList.remove('show');
  tt.setAttribute('aria-hidden', 'true');
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-time').textContent   = new Date().toTimeString().slice(0, 8);
  document.getElementById('hud-cursor').textContent =
    `${String(Math.round(mx)).padStart(4,'0')}, ${String(Math.round(my)).padStart(4,'0')}`;
}

// ── Mouse ────────────────────────────────────────────────────
document.getElementById('kaleido-canvas').addEventListener('mouseleave', () => {
  kaleido.mouseActive = false;
});

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  kaleido.setMouse(mx, my);

  const tt = document.getElementById('tooltip');
  if (tt.classList.contains('show')) {
    tt.style.left = (mx + 18) + 'px';
    tt.style.top  = (my - 50) + 'px';
  }
});

window.addEventListener('resize', () => kaleido.resize());

// ── Render loop ──────────────────────────────────────────────
function loop() {
  kaleido.draw();
  updateHUD();
  requestAnimationFrame(loop);
}

// ── Init ─────────────────────────────────────────────────────
kaleido = new Kaleidoscope(document.getElementById('kaleido-canvas'));
kaleido.setMouse(mx, my);
buildNav();
boot();
loop();
