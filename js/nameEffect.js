/* ============================================================
   NAME EFFECT
   1. Sample the active centre of the kaleido canvas
   2. Clip it to the letter shapes with destination-in
   3. Shimmer sweep + ambient opacity pulse
   ============================================================ */

class NameEffect {
  constructor(nameCanvas, kaleidoCanvas) {
    this.canvas  = nameCanvas;
    this.kCanvas = kaleidoCanvas;
    this.ctx     = nameCanvas.getContext('2d');
    this.shimX   = 0;
    this.tick    = 0;
    this.ready   = false;

    document.fonts.ready.then(() => {
      this.ready = true;
      this.resize();
    });
  }

  resize() {
    this.canvas.width  = Math.min(window.innerWidth * 0.85, 960);
    this.canvas.height = 90;
  }

  draw() {
    if (!this.ready) return;
    this.tick++;

    const { ctx, canvas, kCanvas } = this;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // ── 1. Draw kaleido content from the active centre ────────
    // The centre of the kaleido has the most pattern activity
    // (radial waves, spirals). Sample a wide centre strip.
    const kW = kCanvas.width, kH = kCanvas.height;
    ctx.drawImage(
      kCanvas,
      kW * 0.1,  kH * 0.35,   // source x, y  (centre region)
      kW * 0.8,  kH * 0.30,   // source w, h
      0, 0, W, H               // dest fills the whole name canvas
    );

    // ── 2. Clip to letter shapes with destination-in ──────────
    // destination-in keeps only the pixels where the new draw lands
    ctx.globalCompositeOperation = 'destination-in';
    ctx.font = '700 72px "Jersey 10"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Vishaal Ravikumar', W / 2, H / 2 + 4);
    ctx.globalCompositeOperation = 'source-over';

    // ── 3. Shimmer sweep ─────────────────────────────────────
    this.shimX = (this.shimX + 1.4) % (W + 280);
    ctx.globalCompositeOperation = 'source-atop';
    const shimmer = ctx.createLinearGradient(this.shimX - 140, 0, this.shimX + 140, 0);
    shimmer.addColorStop(0,    'rgba(255,255,255,0)');
    shimmer.addColorStop(0.4,  'rgba(255,255,255,0.15)');
    shimmer.addColorStop(0.5,  'rgba(255,255,255,0.40)');
    shimmer.addColorStop(0.6,  'rgba(255,255,255,0.15)');
    shimmer.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // ── 4. Ambient breath ────────────────────────────────────
    this.canvas.style.opacity = 0.82 + 0.18 * Math.sin(this.tick * 0.018);
  }
}
