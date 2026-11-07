/* Muse AI Forms — Signal Field background
 * Dependency-free, deterministic, responsive canvas animation.
 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function mulberry32(seed) {
    return function () {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  class SignalField {
    constructor(host, options = {}) {
      this.host = host;
      this.options = Object.assign({ density: 1, speed: 1, interactive: true, seed: 27, nodeCount: 12 }, options);
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'muse-bg-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.random = mulberry32(this.options.seed);
      this.particles = [];
      this.nodes = [];
      this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.time = 0;
      this.last = 0;
      this.resize = this.resize.bind(this);
      this.frame = this.frame.bind(this);
      this.onPointer = this.onPointer.bind(this);
      this.reduced.addEventListener?.('change', () => this.build());
      window.addEventListener('resize', this.resize, { passive: true });
      if (this.options.interactive) window.addEventListener('pointermove', this.onPointer, { passive: true });
      this.resize();
      this.build();
      requestAnimationFrame(this.frame);
    }

    resize() {
      const box = this.host.getBoundingClientRect();
      this.width = Math.max(1, box.width);
      this.height = Math.max(1, box.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    build() {
      this.random = mulberry32(this.options.seed);
      const areaScale = clamp((this.width * this.height) / 900000, 0.45, 1.85);
      const count = Math.round(95 * areaScale * this.options.density);
      this.particles = Array.from({ length: count }, () => ({
        x: this.random(), y: this.random(), r: .45 + this.random() * 1.65,
        a: .16 + this.random() * .58, drift: .08 + this.random() * .28,
        phase: this.random() * TAU, tint: this.random() < .52 ? 'cyan' : 'violet'
      }));
      this.nodes = Array.from({ length: this.options.nodeCount }, (_, i) => ({
        x: .12 + this.random() * .76, y: .18 + this.random() * .65,
        r: 2.1 + this.random() * 2.2, phase: this.random() * TAU,
        color: i % 5 === 0 ? 'coral' : (i % 2 ? 'violet' : 'cyan')
      }));
    }

    onPointer(event) {
      this.pointer.tx = clamp(event.clientX / window.innerWidth, 0, 1);
      this.pointer.ty = clamp(event.clientY / window.innerHeight, 0, 1);
    }

    color(name, alpha) {
      const colors = { cyan: [98, 229, 228], violet: [157, 124, 255], coral: [255, 139, 135] };
      const c = colors[name] || colors.violet;
      return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    }

    drawAurora(ctx, t) {
      const bands = [
        { y: .37, amp: .105, width: 130, color: 'violet', phase: 0.2 },
        { y: .52, amp: .09, width: 95, color: 'cyan', phase: 2.1 },
        { y: .67, amp: .13, width: 155, color: 'coral', phase: 4.2 }
      ];
      bands.forEach((band, index) => {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = `blur(${band.width / 3}px)`;
        ctx.beginPath();
        const start = -this.width * .08;
        ctx.moveTo(start, this.height * band.y);
        for (let x = start; x <= this.width * 1.08; x += 24) {
          const nx = x / this.width;
          const wave = Math.sin(nx * 7.2 + t * (.22 + index * .035) + band.phase) * band.amp;
          const wave2 = Math.sin(nx * 14 - t * .11 + band.phase) * band.amp * .34;
          ctx.lineTo(x, this.height * (band.y + wave + wave2));
        }
        ctx.lineTo(this.width * 1.1, this.height + 200);
        ctx.lineTo(-this.width * .1, this.height + 200);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, this.width, 0);
        grad.addColorStop(0, this.color(band.color, 0));
        grad.addColorStop(.28, this.color(band.color, .15));
        grad.addColorStop(.65, this.color(band.color, .22));
        grad.addColorStop(1, this.color(band.color, 0));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
    }

    drawParticles(ctx, t) {
      const px = (this.pointer.x - .5) * 22;
      const py = (this.pointer.y - .5) * 16;
      this.particles.forEach(p => {
        const x = p.x * this.width + px * p.drift;
        const y = p.y * this.height + py * p.drift + Math.sin(t * .42 + p.phase) * 7;
        const pulse = .72 + Math.sin(t * .8 + p.phase) * .28;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, TAU);
        ctx.fillStyle = this.color(p.tint, p.a * pulse);
        ctx.fill();
      });
    }

    drawNetwork(ctx, t) {
      const pts = this.nodes.map((n) => ({ x: n.x * this.width + (this.pointer.x - .5) * 34, y: n.y * this.height + (this.pointer.y - .5) * 23 }));
      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < Math.min(this.width, this.height) * .27) {
            ctx.strokeStyle = `rgba(151,145,220,${.16 * (1 - distance / (Math.min(this.width, this.height) * .27))})`;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      this.nodes.forEach((n, i) => {
        const p = pts[i], pulse = .75 + Math.sin(t * .9 + n.phase) * .25;
        ctx.beginPath(); ctx.arc(p.x, p.y, n.r + 6 * pulse, 0, TAU);
        ctx.fillStyle = this.color(n.color, .05 * pulse); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, n.r, 0, TAU);
        ctx.fillStyle = this.color(n.color, .82); ctx.fill();
        ctx.strokeStyle = this.color(n.color, .32); ctx.stroke();
      });
    }

    frame(now) {
      const dt = Math.min((now - this.last) / 1000 || 0, .05);
      this.last = now;
      const moving = !this.reduced.matches;
      if (moving) this.time += dt * this.options.speed;
      this.pointer.x += (this.pointer.tx - this.pointer.x) * (moving ? .055 : .12);
      this.pointer.y += (this.pointer.ty - this.pointer.y) * (moving ? .055 : .12);
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      this.drawAurora(ctx, this.time);
      this.drawParticles(ctx, this.time);
      this.drawNetwork(ctx, this.time);
      requestAnimationFrame(this.frame);
    }
  }

  function mount(host, options) {
    if (!host || host.__museSignalField) return host?.__museSignalField;
    const field = new SignalField(host, options);
    host.__museSignalField = field;
    return field;
  }

  global.MuseFormsBackground = { mount, SignalField };
  document.querySelectorAll('.muse-bg').forEach((host) => mount(host));
})(window);
