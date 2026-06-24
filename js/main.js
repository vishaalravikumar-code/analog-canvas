/* ============================================================
   MAIN — boot, HUD, nav, render loop
   ============================================================ */

let mx = window.innerWidth  / 2;
let my = window.innerHeight / 2;
let prevMx = mx, prevMy = my;
let mouseSpeed = 0;
let kaleido, synth;

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  document.getElementById('boot-progress').style.width = '100%';
  setTimeout(() => {
    document.getElementById('boot').classList.add('hidden');
    revealUI();
  }, 2000);
}

function revealUI() {
  // UI chrome hidden until needed — volume button always visible
  document.getElementById('vol-btn').classList.add('visible');
}

// ── Volume button ─────────────────────────────────────────────
function toggleVolume() {
  const muted = synth.toggleMute();
  document.getElementById('vol-on').style.display  = muted ? 'none'  : 'block';
  document.getElementById('vol-off').style.display = muted ? 'block' : 'none';
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
document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;

  // Smoothed speed in px/frame (approx)
  const rawSpeed = Math.hypot(mx - prevMx, my - prevMy);
  mouseSpeed = mouseSpeed * 0.75 + rawSpeed * 0.25;
  prevMx = mx; prevMy = my;

  kaleido.setMouse(mx, my);
  synth.setMouseVelocity(mouseSpeed);

  const tt = document.getElementById('tooltip');
  if (tt.classList.contains('show')) {
    tt.style.left = (mx + 18) + 'px';
    tt.style.top  = (my - 50) + 'px';
  }
});

document.getElementById('kaleido-canvas') &&
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('kaleido-canvas').addEventListener('mouseleave', () => {
      kaleido.clearTrail();
    });
  });

window.addEventListener('resize', () => kaleido.resize());

// ── Render loop ──────────────────────────────────────────────
function loop() {
  kaleido.draw();
  updateHUD();
  requestAnimationFrame(loop);
}

// ── Synth — starts on first click ────────────────────────────
synth = new AmbientSynth();
document.addEventListener('click', () => synth.start(), { once: true });

// ── Init ─────────────────────────────────────────────────────
kaleido = new Kaleidoscope(document.getElementById('kaleido-canvas'));
kaleido.setMouse(mx, my);
buildNav();
boot();
loop();
