import * as THREE from 'three';

const root = document.documentElement;
root.classList.add('js');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = typeof window.gsap !== 'undefined';
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

/* ---------- theme ---------- */
const themeBtn = document.querySelector('.theme');
themeBtn?.addEventListener('click', () => {
  const dark = getComputedStyle(root).colorScheme === 'dark';
  const next = dark ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  window.dispatchEvent(new Event('themechange'));
});

/* ---------- split headings into words ---------- */
document.querySelectorAll('[data-split]').forEach((el) => {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'word';
          const i = document.createElement('span'); i.textContent = part;
          w.appendChild(i); frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  walk(el);
});

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  if (hasGSAP) {
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (!target && id !== '#top') return;
      e.preventDefault();
      lenis.scrollTo(id === '#top' ? 0 : target, { offset: -70 });
    });
  });
}

/* ---------- nav + progress ---------- */
const nav = document.querySelector('.nav');
const bar = document.querySelector('.progress span');
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 30);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- reveals, counters, bars ---------- */
const fmt = (v, dec, sep) => {
  const s = v.toFixed(dec);
  return sep ? Number(s).toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s;
};
const countUp = (el) => {
  const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), sep = !!el.dataset.sep;
  if (reduced || !hasGSAP) { el.textContent = fmt(end, dec, sep); return; }
  const o = { v: 0 };
  gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, dec, sep); } });
};

if (hasGSAP && !reduced) {
  gsap.registerPlugin(window.ScrollTrigger);

  gsap.utils.toArray('[data-split]').forEach((el, i) => {
    const words = el.querySelectorAll('.word > span');
    gsap.set(words, { yPercent: 110 });
    const inHero = el.closest('.hero');
    gsap.to(words, {
      yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035, delay: inHero ? 0.25 : 0,
      scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 85%' },
    });
  });

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const inHero = el.closest('.hero');
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: inHero ? 0.7 : 0,
      scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 88%' },
    });
  });

  document.querySelectorAll('[data-count]').forEach((el) => {
    window.ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el) });
  });
  document.querySelectorAll('[data-bar]').forEach((el) => {
    gsap.to(el, { width: el.dataset.bar + '%', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  // hero text drifts up as you leave it
  gsap.to('.hero-inner', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  document.querySelectorAll('[data-count]').forEach(countUp);
  document.querySelectorAll('[data-bar]').forEach((el) => { el.style.width = el.dataset.bar + '%'; });
}

/* ---------- tilt + glow ---------- */
const fine = window.matchMedia('(pointer: fine)').matches;
if (fine && !reduced) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = el.classList.contains('card') ? 7 : 5;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
  document.querySelectorAll('.btn').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.18}px`);
      b.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.25}px`);
    });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
  });
}

/* ---------- turn cycle shared by the hero and the readout ---------- */
// 7.2 s loop: caller speaks, pauses mid-thought, carries on, then really finishes.
const CYCLE = 7.2;
function turnState(t) {
  const c = t % CYCLE;
  if (c < 2.6) return { speak: 0.65 + 0.35 * Math.abs(Math.sin(c * 6.3)), p: 0.03 + 0.02 * Math.abs(Math.sin(c * 3)), label: 'caller speaking' };
  if (c < 3.4) { const k = (c - 2.6) / 0.8; return { speak: 0.12, p: 0.05 + k * 0.33, label: 'mid-sentence pause' }; }
  if (c < 5.0) { const k = (c - 3.4) / 1.6; return { speak: 0.6 + 0.4 * Math.abs(Math.sin(c * 5.1)), p: 0.38 - k * 0.33, label: 'caller speaking' }; }
  if (c < 6.2) { const k = (c - 5.0) / 1.2; return { speak: 0.06 * (1 - k), p: 0.05 + k * 0.9, label: 'finished?' }; }
  return { speak: 0.0, p: 0.95, label: 'agent replies' };
}

/* ---------- hero terrain ---------- */
function initTerrain() {
  const canvas = document.getElementById('terrain');
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 2.9, 8.6);
  camera.lookAt(0, -0.2, 0);

  const W = 16, D = 6.5;
  const geo = new THREE.PlaneGeometry(W, D, 260, 100);
  geo.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime: { value: 0 },
    uSpeak: { value: 0 },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uMouseAmt: { value: 0 },
    uPixel: { value: renderer.getPixelRatio() },
    uInk: { value: new THREE.Color() },
    uAccent: { value: new THREE.Color() },
  };
  const setColors = () => {
    uniforms.uInk.value.set(css('--ink') || '#161513');
    uniforms.uAccent.value.set(css('--accent') || '#e2552a');
  };
  setColors();
  window.addEventListener('themechange', setColors);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', setColors);

  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uTime, uSpeak, uMouseAmt, uPixel;
      uniform vec2 uMouse;
      varying float vH; varying float vEdge;
      void main() {
        vec3 p = position;
        float t = uTime;
        float band = exp(-pow(p.z * 0.75, 2.0));
        float carrier = sin(p.x * 2.1 - t * 3.2) * 0.5 + sin(p.x * 4.9 + t * 2.3) * 0.28 + sin(p.x * 10.7 - t * 5.1) * 0.12;
        float env = uSpeak * (0.55 + 0.45 * sin(p.x * 0.55 - t * 1.4));
        float h = carrier * env * band * 0.95;
        float d = distance(p.xz, uMouse);
        h += uMouseAmt * 0.42 * exp(-d * d * 0.55) * sin(d * 5.5 - t * 6.0);
        h += 0.07 * sin(p.x * 0.5 + t * 0.45) * cos(p.z * 0.9 + t * 0.35);
        p.y = h;
        vH = h;
        vEdge = smoothstep(8.0, 4.5, abs(p.x)) * smoothstep(3.25, 1.6, abs(p.z));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPixel * (2.4 + abs(h) * 3.5) * (6.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uInk, uAccent;
      varying float vH; varying float vEdge;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.15, r);
        float k = smoothstep(0.08, 0.42, abs(vH));
        vec3 col = mix(uInk, uAccent, k);
        float a = soft * vEdge * mix(0.32, 0.95, k);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  group.position.y = -0.9;
  scene.add(group);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 700 ? 11 : 8.6;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.9);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const target = new THREE.Vector2(99, 99);
  let mouseAmt = 0, mouseTarget = 0, tiltX = 0, tiltY = 0, tx = 0, ty = 0;
  const hero = document.querySelector('.hero');
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) { target.set(hit.x, hit.z); mouseTarget = 1; }
    tx = ndc.x * 0.12; ty = ndc.y * 0.05;
  });
  hero.addEventListener('pointerleave', () => { mouseTarget = 0; tx = 0; ty = 0; });

  const roState = document.getElementById('ro-state');
  const roBar = document.getElementById('ro-bar');
  const roP = document.getElementById('ro-p');
  let lastLabel = '';

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  let speak = 0;
  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = reduced ? 1.2 : clock.getElapsedTime();
    const s = turnState(t);
    speak += (s.speak - speak) * 0.08;
    uniforms.uTime.value = t;
    uniforms.uSpeak.value = speak;
    mouseAmt += (mouseTarget - mouseAmt) * 0.05;
    uniforms.uMouseAmt.value = mouseAmt;
    uniforms.uMouse.value.lerp(target, 0.12);
    tiltX += (tx - tiltX) * 0.04; tiltY += (ty - tiltY) * 0.04;
    const sc = Math.min(window.scrollY / window.innerHeight, 1);
    group.rotation.y = tiltX;
    group.rotation.x = tiltY + sc * 0.25;
    group.position.y = -0.9 - sc * 0.8;
    renderer.render(scene, camera);

    if (s.label !== lastLabel) { roState.textContent = s.label; lastLabel = s.label; }
    roBar.style.width = `${Math.round(s.p * 100)}%`;
    roP.textContent = s.p.toFixed(2);
  };
  tick();
}
initTerrain();

/* ---------- haan figure ---------- */
function initWave() {
  const cv = document.getElementById('wave');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener('resize', size);

  // one utterance across the strip: speech, a short pause, more speech, the real end
  const amp = (x) => {
    if (x < 0.06) return 0;
    if (x < 0.40) return 0.55 + 0.45 * Math.abs(Math.sin(x * 61));
    if (x < 0.50) return 0.04;
    if (x < 0.72) return 0.5 + 0.5 * Math.abs(Math.sin(x * 53));
    return 0.03;
  };
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
  const start = performance.now();
  const draw = (now) => {
    requestAnimationFrame(draw);
    if (!visible) return;
    const t = reduced ? 0.8 : ((now - start) / 1000 / 6) % 1;
    const ink = css('--ink-3'), acc = css('--accent'), base = css('--rule');
    ctx.clearRect(0, 0, w, h);
    const mid = h * 0.5, n = Math.floor(w / 4);
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const a = amp(x) * (0.75 + 0.25 * Math.sin(i * 1.7));
      const bh = Math.max(2, a * h * 0.38);
      ctx.fillStyle = x <= t ? (a > 0.1 ? css('--ink') : base) : base;
      ctx.fillRect(i * 4, mid - bh, 2, bh * 2);
    }
    // markers
    const mark = (x, color, label, dy) => {
      const px = x * w;
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, h - 10); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = '11px "Geist Mono", monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, Math.min(px + 6, w - tw - 4), dy);
    };
    if (t > 0.43) mark(0.43, ink, 'cuts in here', 18);
    if (t > 0.78) mark(0.78, acc, 'waits for this', h - 12);
    // playhead
    ctx.fillStyle = acc;
    ctx.fillRect(t * w, 4, 2, h - 8);
  };
  requestAnimationFrame(draw);
}
initWave();

/* ---------- footer clock ---------- */
const clockEl = document.getElementById('clock');
const tickClock = () => {
  try {
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date());
    clockEl.textContent = `Liverpool · ${time}`;
  } catch (e) {}
};
tickClock(); setInterval(tickClock, 30000);
