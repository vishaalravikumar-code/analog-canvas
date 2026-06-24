/* ============================================================
   KALEIDOSCOPE — left/right mirror symmetry only
   More complex field: radial waves + spiral arms + cross terms
   ============================================================ */

const PALETTE = [
  '#050508', // black
  '#0047FF', // electric blue
  '#0047FF', // electric blue (replacing pink)
  '#CC0000', // red
  '#6B6B00', // olive green
  '#FFE000', // yellow
];

const PIX = 5;

class Kaleidoscope {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W = this.H = 0;
    this.t     = 0;
    this.trail = [];
    this.resize();
  }

  resize() {
    this.W = this.canvas.width  = Math.round(window.innerWidth  * 0.75);
    this.H = this.canvas.height = Math.round(window.innerHeight * 0.75);
  }

  setMouse(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = Math.max(0, Math.min(rect.width,  x - rect.left)) / rect.width;
    const cy = Math.max(0, Math.min(rect.height, y - rect.top))  / rect.height;

    // Fold only horizontally — left/right symmetry
    const nx = (cx < 0.5 ? cx : 1 - cx) * 2; // [0,1] within left half
    const ny = cy;                              // full height, no fold

    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(nx - last.nx, ny - last.ny) > 0.012) {
      this.trail.push({ nx, ny, strength: 1.0 });
    }
  }

  clearTrail() { this.trail = []; }

  _field(nx, ny) {
    const t  = this.t;
    const px = nx * 40;
    const py = ny * 40 - this.t * 4; // drift upward over time

    // Center of the field space
    const cx = 20, cy = 20;
    const dx = px - cx, dy = py - cy;
    const r  = Math.sqrt(dx * dx + dy * dy);
    const a  = Math.atan2(dy, dx);

    let v = (
      // Base waves — varied frequencies
      Math.sin(px * 1.1  + t)          * Math.cos(py * 0.85 + t * 0.7)   +
      Math.sin(px * 0.5  + py * 0.6    + t * 1.15) * 0.9                 +
      Math.cos(px * 0.75 - py * 0.4    + t * 0.55) * 0.7                 +
      Math.sin(px * 0.25 + py * 0.95   + t * 0.9)  * 0.5                 +
      // Cross-product term — creates sharp diagonal tendrils
      Math.sin(px * py * 0.08          + t * 0.6)  * 0.6                 +
      // Radial waves — concentric rings expanding outward from center
      Math.sin(r  * 1.1  - t * 3.5)               * 0.7                 +
      // Spiral arms — rotate outward over time
      Math.sin(a  * 3   + r * 0.6      - t * 2.0)  * 0.5                 +
      // Fine detail layer — small, fast shapes
      Math.cos(px * 2.2 + py * 1.8     + t * 1.3)  * 0.35
    );

    // Trail blobs
    for (const p of this.trail) {
      const ddx = nx - p.nx, ddy = ny - p.ny;
      v += Math.exp(-(ddx * ddx + ddy * ddy) / 0.028) * 2.6 * p.strength;
    }

    return v;
  }

  _color(v) {
    // Wider normalisation range to absorb the extra field complexity
    const n = (v + 4.5) / 9.0;
    const c = Math.max(0, Math.min(0.9999, n));

    if (c < 0.06)              return PALETTE[0];
    if (c < 0.18)              return PALETTE[1]; // blue
    if (c < 0.27)              return PALETTE[4]; // olive
    if (c < 0.32)              return PALETTE[0]; // black sep
    if (c < 0.38)              return PALETTE[3]; // red tendril
    if (c < 0.43)              return PALETTE[0]; // black sep
    if (c < 0.55)              return PALETTE[2]; // pink
    if (c < 0.66)              return PALETTE[5]; // yellow
    if (c < 0.74)              return PALETTE[1]; // blue
    if (c < 0.79)              return PALETTE[0]; // black
    if (c < 0.87)              return PALETTE[4]; // olive
    if (c < 0.91)              return PALETTE[3]; // red
    if (c < 0.94)              return PALETTE[0]; // black
                               return PALETTE[2]; // pink edge
  }

  draw() {
    this.t += 0.006;

    for (const p of this.trail) p.strength -= 0.012;
    this.trail = this.trail.filter(p => p.strength > 0);

    const { ctx, W, H } = this;

    // Left half only — mirror to right
    const halfW = Math.ceil(W / 2);
    const cols  = Math.ceil(halfW / PIX);
    const rows  = Math.ceil(H / PIX);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const nx = col / cols; // [0,1] within left half
        const ny = row / rows; // [0,1] full height

        ctx.fillStyle = this._color(this._field(nx, ny));

        const x1 = col * PIX;
        const y1 = row * PIX;
        const x2 = W - x1 - PIX;

        ctx.fillRect(x1, y1, PIX, PIX); // left
        ctx.fillRect(x2, y1, PIX, PIX); // right mirror
      }
    }
  }
}
