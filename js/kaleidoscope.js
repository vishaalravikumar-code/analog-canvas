/* ============================================================
   KALEIDOSCOPE — symmetrical pixel art animation
   Bilateral symmetry (horizontal + vertical mirror)
   Sine-wave driven color assignment, retro 6-color palette
   ============================================================ */

const PALETTE = [
  '#050508', // black
  '#0047FF', // electric blue
  '#FF0077', // hot pink
  '#CC0000', // red
  '#6B6B00', // olive green
  '#FFE000', // yellow
];

const PIX = 5; // block size in px

class Kaleidoscope {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W = this.H = 0;
    this.t  = 0;
    this.trail = []; // [{nx, ny, strength}]
    this.resize();
  }

  resize() {
    this.W = this.canvas.width  = Math.round(window.innerWidth  * 0.75);
    this.H = this.canvas.height = Math.round(window.innerHeight * 0.75);
  }

  setMouse(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = Math.max(0, Math.min(rect.width,  x - rect.left))  / rect.width;
    const cy = Math.max(0, Math.min(rect.height, y - rect.top))   / rect.height;
    // Fold into top-left quadrant
    const nx = Math.abs(cx < 0.5 ? cx : 1 - cx) * 2;
    const ny = Math.abs(cy < 0.5 ? cy : 1 - cy) * 2;

    // Only add a new trail point if mouse moved enough (avoids pile-up)
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(nx - last.nx, ny - last.ny) > 0.015) {
      this.trail.push({ nx, ny, strength: 1.0 });
    }
  }

  clearTrail() {
    this.trail = [];
  }

  // Combine sine waves to produce a scalar field value at (nx, ny)
  // nx, ny are normalized [0,1] coords within the top-left quadrant
  _field(nx, ny) {
    const t = this.t;
    const px = nx * 9;
    const py = ny * 9;

    let v = (
      Math.sin(px * 1.1 + t)         * Math.cos(py * 0.85 + t * 0.7)  +
      Math.sin(px * 0.5 + py * 0.6   + t * 1.15) * 0.9                +
      Math.cos(px * 0.75 - py * 0.4  + t * 0.55) * 0.7                +
      Math.sin(px * 0.25 + py * 0.95 + t * 0.9)  * 0.5
    );

    // Trail blobs — each point adds a Gaussian bump
    for (const p of this.trail) {
      const dx = nx - p.nx;
      const dy = ny - p.ny;
      const dist2 = dx * dx + dy * dy;
      v += Math.exp(-dist2 / 0.028) * 2.6 * p.strength;
    }

    return v;
  }

  // Map field value → palette color
  _color(v) {
    // Normalize to [0, 1]
    const n = (v + 3.1) / 6.2;

    // Thin black outlines between zones give the chunky pixel art separation
    if (n < 0.07)                       return PALETTE[0]; // black
    if (n < 0.20)                       return PALETTE[1]; // electric blue
    if (n < 0.30)                       return PALETTE[4]; // olive green
    if (n < 0.35)                       return PALETTE[0]; // black (separator)
    if (n < 0.41)                       return PALETTE[3]; // red  ← narrow = tendrils
    if (n < 0.47)                       return PALETTE[0]; // black (separator)
    if (n < 0.60)                       return PALETTE[2]; // hot pink
    if (n < 0.73)                       return PALETTE[5]; // yellow
    if (n < 0.83)                       return PALETTE[1]; // electric blue again
    if (n < 0.87)                       return PALETTE[0]; // black
    if (n < 0.96)                       return PALETTE[4]; // olive green
                                        return PALETTE[0]; // black edge
  }

  draw() {
    this.t += 0.006;

    // Fade each trail point and remove fully decayed ones
    for (const p of this.trail) p.strength -= 0.012;
    this.trail = this.trail.filter(p => p.strength > 0);

    const { ctx, W, H } = this;

    // Compute only top-left quadrant, stamp mirrored copies simultaneously
    const halfW = Math.ceil(W / 2);
    const halfH = Math.ceil(H / 2);
    const cols  = Math.ceil(halfW / PIX);
    const rows  = Math.ceil(halfH / PIX);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const nx = col / cols; // [0,1]
        const ny = row / rows;

        const v  = this._field(nx, ny);
        ctx.fillStyle = this._color(v);

        const x1 = col * PIX;
        const y1 = row * PIX;
        // Mirror coords — snap to pixel grid to avoid seam gaps
        const x2 = W - x1 - PIX;
        const y2 = H - y1 - PIX;

        // Top-left
        ctx.fillRect(x1, y1, PIX, PIX);
        // Top-right
        ctx.fillRect(x2, y1, PIX, PIX);
        // Bottom-left
        ctx.fillRect(x1, y2, PIX, PIX);
        // Bottom-right
        ctx.fillRect(x2, y2, PIX, PIX);
      }
    }
  }
}
