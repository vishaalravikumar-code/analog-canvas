/* ============================================================
   MAIN — boot, HUD, nav, render loop
   ============================================================ */

let mx = window.innerWidth  / 2;
let my = window.innerHeight / 2;
let space;

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  document.getElementById('boot-progress').style.width = '100%';
  setTimeout(() => {
    document.getElementById('boot').classList.add('hidden');
    revealUI();
  }, 2000);
}

function revealUI() {
  document.querySelectorAll('.corner').forEach(el => el.classList.add('visible'));
  document.getElementById('hud-top').classList.add('visible');
  document.getElementById('hud-bottom').classList.add('visible');
  document.getElementById('info-panel').classList.add('visible');
  document.getElementById('identity').classList.add('visible');
}

// ── Nav nodes ────────────────────────────────────────────────
function buildNav() {
  const nav = document.getElementById('case-nav');
  nav.innerHTML = CASE_STUDIES.map((cs, i) => `
    <a class="cs-node" href="${cs.href}"
       onmouseenter="onNodeEnter(${i}, event)"
       onmouseleave="onNodeLeave(${i})">
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
  const warp = space.warpFactor;

  document.getElementById('hud-time').textContent     = new Date().toTimeString().slice(0, 8);
  document.getElementById('hud-cursor').textContent   =
    `${String(Math.round(mx)).padStart(4,'0')}, ${String(Math.round(my)).padStart(4,'0')}`;
  document.getElementById('hud-velocity').textContent = (warp * 9.99).toFixed(2);
  document.getElementById('hud-mode').textContent     = warp > 0.5 ? 'WARP SPEED' : 'DEEP SPACE';
  document.getElementById('hud-hint').textContent     = warp > 0.5 ? 'HOVER PLANETS TO EXPLORE' : 'MOVE TOWARD CENTER TO WARP';
}

// ── Mouse ────────────────────────────────────────────────────
document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  space.setMouse(mx, my);

  // Show case nav when warping
  const nav = document.getElementById('case-nav');
  if (space.warpFactor > 0.42) {
    nav.classList.add('visible');
  } else {
    nav.classList.remove('visible');
  }

  // Follow tooltip
  const tt = document.getElementById('tooltip');
  if (tt.classList.contains('show')) {
    tt.style.left = (mx + 18) + 'px';
    tt.style.top  = (my - 50) + 'px';
  }
});

// ── Resize ───────────────────────────────────────────────────
window.addEventListener('resize', () => space.resize());

// ── Render loop ──────────────────────────────────────────────
function loop() {
  space.draw();
  updateHUD();
  requestAnimationFrame(loop);
}

// ── Init ─────────────────────────────────────────────────────
space = new Space(document.getElementById('space-canvas'));
space.setMouse(mx, my);
buildNav();
boot();
loop();
