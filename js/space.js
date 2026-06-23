/* ============================================================
   SPACE — one-point perspective ASCII starfield + planets
   ============================================================ */

const STAR_CHARS  = ['.', '·', '+', '*', '°', 'x', 'o', ',', '-'];
const PLANET_CHARS = ['○', '◎', '●', '◉', '⊙', '◐', '◑', '◒', '◓'];
const DISSOLVE_CHARS = ['@', '#', '%', '░', '▒', '▓', '■', '◆', '▲', '∆', '⌬', '⟡'];
const RING_CHARS  = ['-', '~', '=', '≈', '–', '—'];

class Space {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W = this.H = 0;
    this.mx = 0; this.my = 0;     // mouse position
    this.warpFactor = 0;           // 0–1, driven by mouse proximity to center
    this.tick = 0;
    this.stars   = [];
    this.planets = [];
    this.resize();
  }

  resize() {
    this.W = this.canvas.width  = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
    this._initStars();
    this._initPlanets();
  }

  setMouse(x, y) {
    this.mx = x;
    this.my = y;

    // Warp: proximity to center drives speed
    const cx = this.W / 2, cy = this.H / 2;
    const dist = Math.hypot(x - cx, y - cy);
    const maxD = Math.min(this.W, this.H) * 0.46;
    this.warpFactor = Math.max(0, 1 - dist / maxD);
  }

  _initStars() {
    this.stars = [];
    const count = Math.floor((this.W * this.H) / 9000);
    for (let i = 0; i < count; i++) {
      this.stars.push(this._newStar(Math.random())); // random initial depth
    }
  }

  _newStar(z = 1) {
    const colorRoll = Math.random();
    let color;
    if      (colorRoll < 0.55) color = [214, 214, 255]; // soft white
    else if (colorRoll < 0.78) color = [0, 247, 255];   // cyan
    else if (colorRoll < 0.92) color = [122, 0, 255];   // purple
    else                       color = [255, 0, 170];   // magenta (rare)

    return {
      // normalized coords relative to center (-1..1)
      nx: (Math.random() - 0.5) * 2,
      ny: (Math.random() - 0.5) * 2,
      z,                               // depth: 1=far, 0=close/passed
      // Each star gets its own speed — spread across a wide range for depth variation
      baseSpeed: 0.0003 + Math.random() * Math.random() * 0.004,
      char: STAR_CHARS[Math.floor(Math.random() * STAR_CHARS.length)],
      color,
      twinklePhase: Math.random() * Math.PI * 2,
      dissolving: false,
    };
  }

  _initPlanets() {
    // Two large decorative planets — edge-hugging, slow-moving
    this.planets = [
      {
        // Left planet — ringed, cyan
        nx: -0.72, ny: 0.28,
        z: 0.18,
        speed: 0.00008,
        radius: 90,
        hasRing: true,
        color: '#00F7FF',
        glowPulse: 0,
        hover: false,
      },
      {
        // Right planet — no ring, purple
        nx: 0.78, ny: -0.32,
        z: 0.22,
        speed: 0.00006,
        radius: 72,
        hasRing: false,
        color: '#7A00FF',
        glowPulse: Math.PI,
        hover: false,
      },
    ];
  }

  draw() {
    const { ctx, W, H, tick, warpFactor } = this;
    this.tick++;

    ctx.fillStyle = '#080812';
    ctx.fillRect(0, 0, W, H);

    // Vanishing point drifts subtly with mouse
    const vx = W / 2 + (this.mx - W / 2) * 0.06;
    const vy = H / 2 + (this.my - H / 2) * 0.06;

    this._updateAndDrawStars(vx, vy, warpFactor);
    this._drawPlanets(vx, vy);
    this._drawCenterGlow(vx, vy, warpFactor);
  }

  _project(nx, ny, z, vx, vy) {
    // Project normalized coords through vanishing point
    const scale = 1 / z;
    return {
      sx: vx + nx * (this.W * 0.55) * scale,
      sy: vy + ny * (this.H * 0.55) * scale,
      scale,
    };
  }

  _updateAndDrawStars(vx, vy, warpFactor) {
    const { ctx, tick } = this;
    const speed = warpFactor * warpFactor; // quadratic feels more like warp

    for (const s of this.stars) {
      s.twinklePhase += 0.025;
      s.z -= s.baseSpeed * (1 + speed * 8);

      // Reset when star passes the viewer
      if (s.z <= 0.01) {
        Object.assign(s, this._newStar(1));
        continue;
      }

      const { sx, sy, scale } = this._project(s.nx, s.ny, s.z, vx, vy);

      // Cull off-screen
      if (sx < -40 || sx > this.W + 40 || sy < -40 || sy > this.H + 40) {
        Object.assign(s, this._newStar(1));
        continue;
      }

      // Mouse proximity dissolve
      const dMouse = Math.hypot(this.mx - sx, this.my - sy);
      const dissolveRadius = 90;
      const dissolveStrength = Math.max(0, 1 - dMouse / dissolveRadius);

      let displayChar = s.char;
      let [r, g, b] = s.color;

      if (dissolveStrength > 0.1) {
        const di = Math.floor(dissolveStrength * DISSOLVE_CHARS.length);
        displayChar = DISSOLVE_CHARS[Math.min(di, DISSOLVE_CHARS.length - 1)];
        // Shift color toward magenta on dissolve
        r = Math.round(r + (255 - r) * dissolveStrength * 0.8);
        g = Math.round(g * (1 - dissolveStrength * 0.7));
        b = Math.round(b + (170 - b) * dissolveStrength * 0.5);
      }

      // Brightness: far=dim, near=bright, twinkle
      const brightness = Math.min(1, (1 - s.z) * 1.4 + 0.15);
      const twinkle = 0.75 + 0.25 * Math.sin(s.twinklePhase);
      const alpha = brightness * twinkle;

      // Font size scales with depth
      const fontSize = Math.max(10, Math.min(32, scale * 9));
      ctx.font = `${fontSize}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;

      // Warp trail: draw a streak toward vanishing point when fast
      if (warpFactor > 0.3 && s.z < 0.6) {
        const trailLen = warpFactor * 18 * (1 - s.z);
        const dx = sx - vx, dy = sy - vy;
        const len = Math.hypot(dx, dy) || 1;
        const tx = sx - (dx / len) * trailLen;
        const ty = sy - (dy / len) * trailLen;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.25})`;
        ctx.lineWidth = Math.max(0.5, fontSize * 0.06);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      ctx.fillText(displayChar, sx, sy);
    }
  }

  _drawPlanets(vx, vy) {
    const { ctx } = this;

    // Sort back-to-front
    const sorted = [...this.planets].sort((a, b) => b.z - a.z);

    for (const p of sorted) {
      p.glowPulse += 0.018;
      // Planets drift very slowly — just oscillate gently, don't reset
      p.z -= p.speed;
      if (p.z <= 0.08) p.z = 0.08;

      const { sx, sy, scale } = this._project(p.nx, p.ny, p.z, vx, vy);
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;

      const r = p.radius * scale;
      const [pr, pg, pb] = this._hexToRgb(p.color);
      const alpha = Math.min(1, (1 - p.z) * 1.6 + 0.1);
      const pulseGlow = 0.5 + 0.5 * Math.sin(p.glowPulse);

      // Mouse hover detection
      const dMouse = Math.hypot(this.mx - sx, this.my - sy);
      p.hover = dMouse < r * 1.6;

      // Ambient glow
      const glowR = r * (p.hover ? 3.5 : 2.2);
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      glow.addColorStop(0, `rgba(${pr},${pg},${pb},${alpha * 0.22 * (1 + pulseGlow * 0.4)})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Draw planet body as ASCII circle of characters
      this._drawAsciiPlanet(sx, sy, r, p, pr, pg, pb, alpha);

      // Ring
      if (p.hasRing) {
        this._drawRing(sx, sy, r, p, pr, pg, pb, alpha);
      }

      // no hover label — planets are purely decorative
    }
  }

  _drawAsciiPlanet(sx, sy, r, p, pr, pg, pb, alpha) {
    const { ctx } = this;
    const steps = Math.max(8, Math.floor(r * 1.4));

    // Filled disc of ASCII chars
    const rows = Math.max(3, Math.floor(r * 0.55));
    const fontSize = Math.max(8, Math.min(22, r * 0.45));
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = -rows; row <= rows; row++) {
      const rowY = sy + (row / rows) * r;
      const rowR = Math.sqrt(Math.max(0, 1 - (row / rows) ** 2)) * r;
      const cols = Math.max(1, Math.floor(rowR / (fontSize * 0.62)));

      for (let col = -cols; col <= cols; col++) {
        const cx = sx + (col / cols) * rowR;

        // Mouse proximity dissolve
        const dMouse = Math.hypot(this.mx - cx, this.my - rowY);
        const dissolveStrength = Math.max(0, 1 - dMouse / 80);

        let ch;
        if (Math.abs(col) === cols || Math.abs(row) === rows) {
          ch = PLANET_CHARS[Math.floor(Math.abs(row + col)) % PLANET_CHARS.length];
        } else {
          ch = dissolveStrength > 0.4
            ? DISSOLVE_CHARS[Math.floor(dissolveStrength * DISSOLVE_CHARS.length * 0.8)]
            : '·';
        }

        const edgeDim = 0.5 + 0.5 * (1 - Math.abs(col / cols));
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha * edgeDim})`;
        ctx.fillText(ch, cx, rowY);
      }
    }
  }

  _drawRing(sx, sy, r, p, pr, pg, pb, alpha) {
    const { ctx } = this;
    const ringR = r * 1.8;
    const steps = Math.max(20, Math.floor(ringR * 1.1));
    const fontSize = Math.max(7, Math.min(13, r * 0.28));
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const rx = sx + Math.cos(angle) * ringR;
      // Flatten the ring with a 0.22 y-scale for perspective feel
      const ry = sy + Math.sin(angle) * ringR * 0.22;

      // Hide the part that goes "behind" the planet
      if (Math.sin(angle) > 0 && Math.abs(Math.cos(angle) * ringR) < r * 0.9) continue;

      const ch = RING_CHARS[i % RING_CHARS.length];
      ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha * 0.55})`;
      ctx.fillText(ch, rx, ry);
    }
  }

  _drawCenterGlow(vx, vy, warpFactor) {
    if (warpFactor < 0.05) return;
    const { ctx } = this;
    const r = warpFactor * 180;
    const glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, r);
    glow.addColorStop(0, `rgba(0,247,255,${warpFactor * 0.12})`);
    glow.addColorStop(0.4, `rgba(122,0,255,${warpFactor * 0.06})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(vx, vy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  getHoveredPlanet() {
    return this.planets.find(p => p.hover) || null;
  }

  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
}
