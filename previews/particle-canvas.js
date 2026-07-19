/**
 * <jars-particle-canvas> — Web Component
 * ========================================
 * Galaxy background with blackhole gravity, nebula, star trails.
 * Light DOM (no Shadow DOM), zero dependencies.
 *
 * Usage:
 *   <jars-particle-canvas
 *     theme="dark" speed="1.0" amount="1.0"
 *     bhstrength="0.4" bhradius="100"
 *     trailspeed="1.0" trailamount="1.0"
 *   ></jars-particle-canvas>
 *
 * Click anywhere → spawn blackhole (skips buttons/links/inputs).
 * Mousemove → star trails.
 */

const MAX_STARS = 160;
const MAX_NEBULA = 12;
const MAX_TRAIL = 100;
const MAX_BH = 5;

class ParticleCanvas extends HTMLElement {
  constructor() {
    super();
    this._active = false;
    this._raf = 0;
    this._w = 0; this._h = 0;
    this._stars = []; this._nebulas = [];
    this._trails = []; this._blackholes = [];
    this._mouseX = -1000; this._mouseY = -1000;
    this._mouseInside = false;
    this._lastMX = 0; this._lastMY = 0;
    this._lastTime = 0;
    this._starHue = 230; this._nebulaHue = 260;
    this._trailHue = 270; this._accent = '99,102,241';
    this._speed = 1; this._amount = 1;
    this._bhStr = 0.4; this._bhRad = 100;
    this._trailSpd = 1; this._trailAmt = 1;
    this._theme = 'dark';
  }

  static get observedAttributes() {
    return ['theme','speed','amount','bhstrength','bhradius','trailspeed','trailamount'];
  }

  connectedCallback() {
    this._parse();
    this._readHues();

    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0';
    c.setAttribute('aria-hidden','true');
    this.appendChild(c);
    this._cvs = c;
    this._ctx = c.getContext('2d');
    if (!this._ctx) return;

    this._active = true;
    requestAnimationFrame(() => {
      this._resize();
      this._init();
      this._loop(performance.now());
    });

    // Global listeners with interactive-element filter (like azharmtq.my.id)
    this._getRect = () => this.getBoundingClientRect();
    this._onClick = e => {
      const t = e.target;
      if (t && ['A','BUTTON','INPUT','TEXTAREA','SELECT'].includes(t.tagName)) return;
      if (t && t.closest && t.closest('a,button,nav,.project-card,.theme-btn,.swapper-btn,select,input')) return;
      const r = this._getRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
        this._spawn(e.clientX - r.left, e.clientY - r.top);
    };
    this._onMove = e => {
      const r = this._getRect();
      this._mouseX = e.clientX - r.left;
      this._mouseY = e.clientY - r.top;
      this._mouseInside = true;
    };
    this._onLeave = () => { this._mouseInside = false; };
    this._onResize = () => this._resize();
    document.addEventListener('click', this._onClick);
    document.addEventListener('mousemove', this._onMove);
    document.addEventListener('mouseleave', this._onLeave);
    window.addEventListener('resize', this._onResize);
  }

  disconnectedCallback() {
    this._active = false;
    cancelAnimationFrame(this._raf);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('mouseleave', this._onLeave);
    window.removeEventListener('resize', this._onResize);
  }

  attributeChangedCallback(name, _, val) {
    if (!val) return;
    switch (name) {
      case 'theme': this._theme = val; this._readHues(); this._recolor(); break;
      case 'speed': this._speed = parseFloat(val) || 1; break;
      case 'amount': this._amount = Math.min(2, Math.max(0.1, parseFloat(val) || 1)); this._reinit(); break;
      case 'bhstrength': this._bhStr = Math.min(1, Math.max(0.1, parseFloat(val) || 0.4)); break;
      case 'bhradius': this._bhRad = Math.min(200, Math.max(40, parseFloat(val) || 100)); break;
      case 'trailspeed': this._trailSpd = Math.min(3, Math.max(0.2, parseFloat(val) || 1)); break;
      case 'trailamount': this._trailAmt = Math.min(2, Math.max(0.2, parseFloat(val) || 1)); break;
    }
  }

  _parse() {
    this._theme = this.getAttribute('theme') || 'dark';
    this._speed = parseFloat(this.getAttribute('speed')) || 1;
    this._amount = Math.min(2, Math.max(0.1, parseFloat(this.getAttribute('amount')) || 1));
    this._bhStr = Math.min(1, Math.max(0.1, parseFloat(this.getAttribute('bhstrength')) || 0.4));
    this._bhRad = Math.min(200, Math.max(40, parseFloat(this.getAttribute('bhradius')) || 100));
    this._trailSpd = Math.min(3, Math.max(0.2, parseFloat(this.getAttribute('trailspeed')) || 1));
    this._trailAmt = Math.min(2, Math.max(0.2, parseFloat(this.getAttribute('trailamount')) || 1));
  }

  _readHues() {
    const g = getComputedStyle(this);
    const h = g.getPropertyValue('--jars-a1-hue').trim();
    if (h) {
      const n = parseFloat(h);
      if (n) { this._starHue = n + 30; this._nebulaHue = n - 10; this._trailHue = n + 50; }
      this._accent = g.getPropertyValue('--jars-accent-rgb').trim() || '99,102,241';
    } else {
      const m = { dark: [230,260,270,'99,102,241'], light: [240,270,250,'79,70,229'], orange: [20,35,15,'251,146,60'], sea: [190,170,180,'45,212,191'], rose: [340,350,10,'225,29,72'] };
      const p = m[this._theme] || m.dark;
      this._starHue = p[0]; this._nebulaHue = p[1]; this._trailHue = p[2]; this._accent = p[3];
    }
  }

  _recolor() {
    if (!this._active) return;
    for (const s of this._stars) s.hue = this._starHue + Math.random() * 40 + (Math.random() < 0.3 ? 30 : 0);
    for (const n of this._nebulas) n.hue = this._nebulaHue + Math.random() * 40;
  }

  _reinit() { this._stars = []; this._nebulas = []; this._trails = []; this._blackholes = []; this._init(); }

  _resize() {
    const r = this.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    this._w = r.width; this._h = r.height;
    this._cvs.width = r.width * d; this._cvs.height = r.height * d;
    this._cvs.style.width = r.width + 'px'; this._cvs.style.height = r.height + 'px';
    this._ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  _init() {
    const sc = Math.round(MAX_STARS * (0.5 + this._amount * 0.75));
    const nc = Math.round(MAX_NEBULA * (0.5 + this._amount * 0.75));
    this._stars = [];
    for (let i = 0; i < sc; i++) this._stars.push({
      x: Math.random() * this._w, y: Math.random() * this._h,
      r: 0.5 + Math.random() * 2.5, hue: this._starHue + Math.random() * 40 + (Math.random() < 0.3 ? 30 : 0),
      sat: 30 + Math.random() * 50, lit: 60 + Math.random() * 35,
      o: 0.3 + Math.random() * 0.5, dx: (Math.random() - 0.5) * 0.15, dy: (Math.random() - 0.5) * 0.15,
      tw: Math.random() * Math.PI * 2, ts: 0.005 + Math.random() * 0.02,
    });
    this._nebulas = [];
    for (let i = 0; i < nc; i++) this._nebulas.push({
      x: Math.random() * this._w, y: Math.random() * this._h, r: 60 + Math.random() * 120,
      hue: this._nebulaHue + Math.random() * 40, o: 0.03 + Math.random() * 0.06,
      dx: (Math.random() - 0.5) * 0.05, dy: (Math.random() - 0.5) * 0.05,
    });
  }

  _loop(now) {
    if (!this._active) return;
    const dt = this._lastTime ? Math.min((now - this._lastTime) / 1000, 0.1) * this._speed : 0.016;
    this._lastTime = now;
    const c = this._ctx, W = this._w, H = this._h;
    c.clearRect(0, 0, W, H);

    // Nebula
    for (const n of this._nebulas) {
      n.x += n.dx; n.y += n.dy;
      if (n.x < -n.r) n.x = W + n.r; if (n.x > W + n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = H + n.r; if (n.y > H + n.r) n.y = -n.r;
      const g = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue},60%,50%,${n.o})`);
      g.addColorStop(0.5, `hsla(${n.hue+20},50%,40%,${n.o*0.5})`);
      g.addColorStop(1, `hsla(${n.hue-10},40%,30%,0)`);
      c.fillStyle = g; c.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }

    // Stars
    for (const s of this._stars) {
      s.x += s.dx; s.y += s.dy;
      if (s.x < -5) s.x = W + 5; if (s.x > W + 5) s.x = -5;
      if (s.y < -5) s.y = H + 5; if (s.y > H + 5) s.y = -5;
      s.tw += s.ts;
      const a = s.o * (0.7 + Math.sin(s.tw) * 0.3);
      if (s.r > 1.8) { c.beginPath(); c.arc(s.x, s.y, s.r*2.5, 0, Math.PI*2); c.fillStyle = `hsla(${s.hue},${s.sat}%,${s.lit}%,${a*0.2})`; c.fill(); }
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI*2); c.fillStyle = `hsla(${s.hue},${s.sat}%,${s.lit}%,${a})`; c.fill();
    }

    // Connections
    const big = this._stars.filter(s => s.r > 1.5);
    for (let i = 0; i < big.length; i += 2) for (let j = i + 1; j < big.length; j += 2) {
      const dx = big[i].x - big[j].x, dy = big[i].y - big[j].y, d = Math.sqrt(dx*dx + dy*dy);
      if (d < 100) { c.beginPath(); c.moveTo(big[i].x, big[i].y); c.lineTo(big[j].x, big[j].y); c.strokeStyle = `rgba(${this._accent},${0.06*(1-d/100)})`; c.lineWidth = 0.3; c.stroke(); }
    }

    // Blackhole pull
    for (const bh of this._blackholes) {
      const r = bh.radius, str = bh.strength;
      for (let i = this._stars.length - 1; i >= 0; i--) {
        const s = this._stars[i], dx = bh.x - s.x, dy = bh.y - s.y, d = Math.sqrt(dx*dx + dy*dy);
        if (d < r && d > 0) {
          const pull = str * (1 - d / r);
          s.dx += (dx/d) * pull * 0.5; s.dy += (dy/d) * pull * 0.5;
          s.r = Math.max(0.3, s.r - pull * 0.3);
          if (d < 6 || s.r < 0.3) {
            this._stars.splice(i, 1);
            const side = Math.floor(Math.random() * 4);
            this._stars.push({
              x: side === 0 ? -5 : side === 1 ? W + 5 : Math.random() * W,
              y: side === 2 ? -5 : side === 3 ? H + 5 : Math.random() * H,
              r: 0.5 + Math.random() * 2.5, hue: this._starHue + Math.random() * 40 + (Math.random() < 0.3 ? 30 : 0),
              sat: 30 + Math.random() * 50, lit: 60 + Math.random() * 35,
              o: 0.3 + Math.random() * 0.5, dx: (Math.random() - 0.5) * 0.15, dy: (Math.random() - 0.5) * 0.15,
              tw: Math.random() * Math.PI * 2, ts: 0.005 + Math.random() * 0.02,
            });
          }
        }
      }
      for (let i = this._trails.length - 1; i >= 0; i--) {
        const p = this._trails[i], dx = bh.x - p.x, dy = bh.y - p.y, d = Math.sqrt(dx*dx + dy*dy);
        if (d < r && d > 0) { const pull = str * (1 - d / r) * 3; p.vx += (dx/d) * pull; p.vy += (dy/d) * pull; if (d < 5) this._trails.splice(i, 1); }
      }
    }

    // Draw blackholes
    for (let i = this._blackholes.length - 1; i >= 0; i--) {
      const bh = this._blackholes[i];
      bh.age += dt; bh.ph += dt * 3;
      const pct = bh.age / bh.life;
      if (pct < 0.3) bh.radius = 10 + (bh.mx - 10) * (pct / 0.3); else bh.radius = bh.mx * (1 - (pct - 0.3) / 0.7);
      if (bh.age >= bh.life || bh.radius <= 2) { this._blackholes.splice(i, 1); continue; }
      const g = c.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.radius);
      g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.2, 'rgba(0,0,0,0.8)');
      g.addColorStop(0.5, `rgba(${this._accent},0.3)`); g.addColorStop(1, `rgba(${this._accent},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(bh.x, bh.y, bh.radius, 0, Math.PI*2); c.fill();
      const pulse = 0.5 + Math.sin(bh.ph) * 0.3;
      c.beginPath(); c.arc(bh.x, bh.y, bh.radius * pulse * 0.8, 0, Math.PI*2);
      c.strokeStyle = `rgba(${this._accent},${0.15*(1-pct)})`; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.arc(bh.x, bh.y, bh.radius * 0.3, 0, Math.PI*2);
      c.strokeStyle = `rgba(255,255,255,${0.08*(1-pct)})`; c.lineWidth = 1; c.stroke();
    }

    // Trails
    const vx = this._mouseX - this._lastMX, vy = this._mouseY - this._lastMY;
    this._lastMX = this._mouseX; this._lastMY = this._mouseY;
    const decay = Math.pow(0.95, dt * 60 * this._trailSpd);
    if (this._mouseInside && this._mouseX >= 0 && this._mouseX <= W && this._mouseY >= 0 && this._mouseY <= H) {
      const cnt = Math.min(Math.floor(dt * 120 * this._trailAmt + Math.random()), 4);
      for (let i = 0; i < cnt; i++) {
        if (this._trails.length >= MAX_TRAIL) this._trails.shift();
        this._trails.push({
          x: this._mouseX + (Math.random() - 0.5) * 6, y: this._mouseY + (Math.random() - 0.5) * 6,
          r: 1 + Math.random() * 2, vx: vx * 0.3 + (Math.random() - 0.5) * 0.4, vy: vy * 0.3 + (Math.random() - 0.5) * 0.4,
          age: 0, life: 0.8 + Math.random() * 0.4, hue: this._trailHue + Math.random() * 40, bri: 0.6 + Math.random() * 0.4,
        });
      }
    }
    for (let i = this._trails.length - 1; i >= 0; i--) {
      const p = this._trails[i]; p.x += p.vx; p.y += p.vy; p.vx *= decay; p.vy *= decay; p.age += dt;
      const a = (1 - p.age / p.life) * p.bri * 0.7;
      if (a <= 0) { this._trails.splice(i, 1); continue; }
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI*2); c.fillStyle = `hsla(${p.hue},100%,65%,${a})`; c.fill();
    }

    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  _spawn(x, y) {
    if (this._blackholes.length >= MAX_BH) this._blackholes.shift();
    this._blackholes.push({ x, y, radius: 10, mx: this._bhRad * (0.8 + Math.random() * 0.4), strength: this._bhStr * (0.8 + Math.random() * 0.4), age: 0, life: 3 + Math.random() * 1, ph: 0 });
  }
}

if (!customElements.get('jars-particle-canvas')) customElements.define('jars-particle-canvas', ParticleCanvas);
