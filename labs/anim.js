// Labs animations, drawn live on transparent canvases so each takes the colour of its card.
// They suggest what each lab is about rather than showing its interface.
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.fonts.load('400 40px "Libre Caslon Condensed"');  // canvas text doesn't ask for it by itself
  const TAU = Math.PI * 2;
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const fract = (x) => x - Math.floor(x);
  const hash = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);

  function setup(canvas) {
    const ctx = canvas.getContext("2d");
    const state = { w: 0, h: 0, dpr: 1, ink: "#000" };
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = r.width;
      state.h = r.height;
      canvas.width = Math.round(r.width * state.dpr);
      canvas.height = Math.round(r.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      state.ink = getComputedStyle(canvas).color;
    };
    fit();
    new ResizeObserver(fit).observe(canvas);
    return { ctx, state };
  }

  // ---------------------------------------------------------------- Quarks: grains of light in depth
  // Grains gather into a form, burst, and gather again, quicker each time, until they settle on the word.
  function quarks(canvas) {
    const { ctx, state } = setup(canvas);
    const COUNT = 15000;
    const buf = new Float32Array(COUNT * 5);
    // Each grain can be pushed and carried off by the pointer, and springs back to its place
    const ox = new Float32Array(COUNT), oy = new Float32Array(COUNT), vx = new Float32Array(COUNT), vy = new Float32Array(COUNT);
    const mouse = { x: 0, y: 0, px: 0, py: 0, inside: false, down: false };
    const place = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    canvas.addEventListener("pointerenter", (e) => { place(e); mouse.inside = true; });
    canvas.addEventListener("pointermove", place);
    canvas.addEventListener("pointerleave", () => { mouse.inside = false; mouse.down = false; });
    canvas.addEventListener("pointerdown", () => { mouse.down = true; });
    window.addEventListener("pointerup", () => { mouse.down = false; });
    // Drawn pointer that plays with the grains when nobody else does
    const arrow = (x, y, ink) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 17);
      ctx.lineTo(4.4, 13);
      ctx.lineTo(7.4, 19.4);
      ctx.lineTo(10, 18.2);
      ctx.lineTo(7, 12);
      ctx.lineTo(12.4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const seeds = Array.from({ length: COUNT }, (_, i) => [hash(i * 3 + 1), hash(i * 5 + 2), hash(i * 7 + 3), hash(i * 11 + 4), hash(i * 13 + 5)]);
    const SERIF = '"Libre Caslon Condensed", "Times New Roman", serif', SANS = '"Almost Swiss", sans-serif';
    const glyphForm = (ch, font, size) => (o, S, H) => {
      o.font = `400 ${H * size}px ${font}`;
      o.textAlign = "center";
      o.textBaseline = "alphabetic";
      const m = o.measureText(ch);
      o.fillText(ch, S / 2, H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    };
    const FORMS = [
      ...[..."Quarks"].map((ch) => glyphForm(ch, SANS, 0.95)),
      glyphForm("Quarks", SANS, 0.46),
      (o, S, H) => { [[S / 2, H * 0.3], [S * 0.39, H * 0.68], [S * 0.61, H * 0.68]].forEach(([x, y]) => { o.beginPath(); o.arc(x, y, H * 0.17, 0, TAU); o.fill(); }); },
    ];
    let shapes = [];
    const sample = (draw, n) => {
      const S = 640, H = 360;
      const off = document.createElement("canvas");
      off.width = S;
      off.height = H;
      const o = off.getContext("2d", { willReadFrequently: true });
      o.fillStyle = "#fff";
      draw(o, S, H);
      const d = o.getImageData(0, 0, S, H).data;
      const pts = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 128) pts.push([x / S - 0.5, (y / H - 0.5) * (H / S)]);
      return Array.from({ length: COUNT }, (_, i) => pts[Math.floor(hash(i * 1.37 + n * 17) * pts.length)] || [0, 0]);
    };
    const build = () => { shapes = FORMS.map((f, n) => sample(f, n)); };
    build();
    document.fonts.ready.then(build);
    // How long each form holds, shortening; the last one, the word, rests
    // Written letter by letter, quicker each time; then the whole word; then the symbol
    const HOLDS = [0.75, 0.55, 0.42, 0.34, 0.28, 0.24, 2.2, 1.9];
    const MOVES = [0.8, 0.7, 0.6, 0.52, 0.46, 0.7, 1.2, 1.2];
    const LOOP = HOLDS.reduce((a, h, i) => a + h + MOVES[i], 0);
    return (t) => {
      const { w, h, ink } = state;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      if (!shapes.length) return;
      let rest = t % LOOP, n = 0;
      while (rest >= HOLDS[n] + MOVES[n]) { rest -= HOLDS[n] + MOVES[n]; n++; }
      const a = shapes[n], b = shapes[(n + 1) % shapes.length];
      const moving = clamp((rest - HOLDS[n]) / MOVES[n]);
      const scale = w * 0.92;
      const rot = Math.sin(t * 0.3) * 0.32;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      // The pointer: the visitor's, or a drawn one wandering through the form
      if (!mouse.inside) {
        mouse.x = w * (0.5 + 0.34 * Math.sin(t * 0.9) * Math.cos(t * 0.37));
        mouse.y = h * (0.5 + 0.34 * Math.sin(t * 1.3 + 1));
      }
      const mvx = mouse.x - mouse.px, mvy = mouse.y - mouse.py;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      const R = w * (mouse.down ? 0.2 : 0.13);
      // Worked out once per grain, then drawn three times: red, green and blue apart, like split light
      for (let i = 0; i < COUNT; i++) {
        const s = seeds[i];
        // each grain sets off at its own moment, so a form dissolves rather than slides
        const m = ease(clamp((moving - s[0] * 0.45) / 0.55));
        const burst = Math.sin(m * Math.PI);
        let x = a[i][0] + (b[i][0] - a[i][0]) * m;
        let y = a[i][1] + (b[i][1] - a[i][1]) * m;
        const ang = s[1] * TAU + t * (0.4 + s[4]);
        const drift = 0.0035 + burst * (0.05 + 0.2 * s[2]);
        x += Math.cos(ang) * drift;
        y += Math.sin(ang) * drift;
        const z0 = (s[2] - 0.5) * (0.07 + burst * 0.75);
        const px = x * cr + z0 * sr;
        const z = -x * sr + z0 * cr;
        const persp = 1 / (1 + z * 1.25);
        const j = i * 5;
        const hx = w / 2 + px * scale * persp, hy = h / 2 + y * scale * persp;
        // pushed away from the pointer and swept along with its movement
        const dx = hx + ox[i] - mouse.x, dy = hy + oy[i] - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < R) {
          const f = (1 - dist / R) * (mouse.down ? -2.4 : 2.2) * (0.4 + s[3]);
          vx[i] += (dx / dist) * f + mvx * 0.09;
          vy[i] += (dy / dist) * f + mvy * 0.09;
        }
        vx[i] = (vx[i] - ox[i] * 0.016) * 0.93;
        vy[i] = (vy[i] - oy[i] * 0.016) * 0.93;
        ox[i] += vx[i];
        oy[i] += vy[i];
        const moved = Math.min(40, Math.abs(ox[i]) + Math.abs(oy[i]));
        buf[j] = hx + ox[i];
        buf[j + 1] = hy + oy[i];
        buf[j + 2] = (0.55 + s[3] * s[3] * 1.5) * persp;
        buf[j + 3] = clamp(0.28 + s[3] * 0.72 - z * 0.9, 0.06, 1);
        buf[j + 4] = 1.2 + burst * 16 * s[2] + Math.abs(z) * 14 + moved * 0.35;  // how far the colours part
      }
      ctx.globalCompositeOperation = "lighter";
      [["#ff2a2a", -1], ["#26ff5a", 0], ["#2a5cff", 1]].forEach(([colour, side]) => {
        ctx.fillStyle = colour;
        for (let j = 0; j < buf.length; j += 5) {
          ctx.globalAlpha = buf[j + 3];
          ctx.fillRect(buf[j] + side * buf[j + 4], buf[j + 1] + side * buf[j + 4] * 0.35, buf[j + 2], buf[j + 2]);
        }
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (!mouse.inside) arrow(mouse.x, mouse.y, ink);
    };
  }

  // ---------------------------------------------------------------- U+: flipping characters, more and more
  // One symbol flipping through Unicode with its code; then the view steps back and another comes
  // in, and another, each flipping on its own beat, until the frame is a field of symbols.
  function uplus(canvas) {
    const { ctx, state } = setup(canvas);
    const CHARS = [..."¶&§@†‡※⁂→←↑↓↗✶✦★?!№ßæøåÆØÅ∞Ω√∑∂∫≈≠±×÷♪♫✓€£¥¢%‰«»‹›“”…⌘⌥⏎◊°©®™¿¡µπƒ"];
    const SERIF = '"Libre Caslon Condensed", "Times New Roman", serif';
    // Each step pulls back a little further, and comes a little sooner than the last
    const STAGES = [];
    for (let i = 0, d = 1.5, f = 1; f > 0.014; i++, d = Math.max(0.3, d * 0.86), f *= 0.68) STAGES.push({ d, f });
    const HOLD = 1;
    const LOOP = STAGES.reduce((a, b) => a + b.d, 0) + HOLD;
    return (t) => {
      const { w, h, ink } = state;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      let rest = t % LOOP, i = 0;
      while (i < STAGES.length - 1 && rest >= STAGES[i].d) rest -= STAGES[i++].d;
      const stage = STAGES[i], prev = STAGES[Math.max(0, i - 1)];
      const m = ease(ease(clamp(rest / Math.min(0.5, stage.d * 0.7))));
      const cell = h * 1.05 * (prev.f + (stage.f - prev.f) * m);
      const cols = Math.ceil(w / cell / 2) + 1, rows = Math.ceil(h / cell / 2) + 1;
      const label = cell > 74;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const glyphFont = `400 ${cell * 0.62}px ${SERIF}`;
      const codeFont = `400 ${Math.max(11, Math.min(26, cell * 0.075))}px ${SERIF}`;
      for (let r = -rows; r <= rows; r++) {
        for (let c = -cols; c <= cols; c++) {
          const x = w / 2 + c * cell, y = h / 2 + r * cell;
          if (x < -cell / 2 || x > w + cell / 2 || y < -cell / 2 || y > h + cell / 2) continue;
          // every symbol flips on its own beat
          const period = 0.32 + hash(c * 17 + r * 41 + 3) * 0.5;
          const flip = Math.floor(t / period + hash(c * 7 + r * 13));
          const ch = CHARS[Math.floor(hash(c * 131 + r * 977 + flip * 59) * CHARS.length)];
          ctx.font = glyphFont;
          ctx.fillText(ch, x, y + cell * (label ? 0.14 : 0.2));
          if (label) {
            ctx.font = codeFont;
            ctx.fillText("U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"), x, y + cell * 0.42);
          }
        }
      }
    };
  }

  // ---------------------------------------------------------------- ΔE: real photographs, regraded live
  // The same grade as the lab (temperature, tint, saturation, contrast, split tone, lift, grain,
  // vignette) in a shader, moving between looks, with the before/after line travelling across.
  function deltaE(canvas) {
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return () => {};
    const label = document.createElement("div");
    label.className = "x-grade-label";
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.appendChild(label);
    const PHOTOS = ["photo-1630754157861-e4ffc56bc000", "photo-1784075292370-86c2e07dac41"];
    const LOOKS = ["Nicolas Winding Refn", "Wong Kar-wai", "Blade Runner", "Barry Jenkins", "Mad Max: Fury Road", "The Matrix"];
    const vs = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    const fs = `precision highp float;varying vec2 v;uniform sampler2D img;uniform vec2 cover;
      uniform float t,g,s,c,l,w,gr,vg,split,time;uniform vec3 sh,hi;
      float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 uv=(v-.5)*cover+.5;uv.y=1.-uv.y;
        vec3 o=texture2D(img,uv).rgb;
        if(v.x<split){ gl_FragColor=vec4(o,1.); return; }
        vec3 k=vec3((1.+.32*t)*(1.+.03*g),1.-.15*g,(1.-.32*t)*(1.+.03*g));
        vec3 x=o*k;
        float L=dot(x,vec3(.2126,.7152,.0722));
        x=clamp(L+(x-L)*s,0.,1.);
        x+=c*(x*x*(3.-2.*x)-x);
        L=dot(x,vec3(.2126,.7152,.0722));
        x+=sh*(1.-L)*(1.-L)+hi*L*L;
        x=l+x*(w-l);
        vec2 d=v-.5;
        x*=1.-vg*dot(d,d)*1.6;
        x+=(rnd(floor(v*vec2(640.,360.))+fract(time)*91.)-.5)*gr;
        gl_FragColor=vec4(x,1.);
      }`;
    const shader = (type, src) => { const h = gl.createShader(type); gl.shaderSource(h, src); gl.compileShader(h); return h; };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(gl.getAttribLocation(prog, "p"));
    gl.vertexAttribPointer(gl.getAttribLocation(prog, "p"), 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const textures = [];
    PHOTOS.forEach((id, i) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        textures[i] = { tex, ar: im.naturalWidth / im.naturalHeight };
      };
      im.src = `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=max`;
    });
    let grades = null;
    fetch("/labs/grades.json").then((r) => r.json()).then((list) => { grades = Object.fromEntries(list); });
    const fit = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    fit();
    new ResizeObserver(fit).observe(canvas);
    // Each look comes quicker than the one before, down to a flicker; then a rest, and over again
    const BEATS = [];
    for (let d = 1.5; d > 0.13; d *= 0.8) BEATS.push(d);
    BEATS.push(1.6);
    const LOOP = BEATS.reduce((a, b) => a + b, 0);
    const apply = (P) => {
      gl.uniform1f(U("t"), P.t);
      gl.uniform1f(U("g"), P.g);
      gl.uniform1f(U("s"), P.s);
      gl.uniform1f(U("c"), P.c);
      gl.uniform1f(U("l"), P.l);
      gl.uniform1f(U("w"), P.w);
      gl.uniform1f(U("gr"), P.gr);
      gl.uniform1f(U("vg"), P.v);
      gl.uniform3f(U("sh"), P.sh[0] * 2.2, P.sh[1] * 2.2, P.sh[2] * 2.2);
      gl.uniform3f(U("hi"), P.hi[0] * 2.2, P.hi[1] * 2.2, P.hi[2] * 2.2);
    };
    return (time) => {
      if (!textures[0] || !textures[1] || !grades) return;
      const round = Math.floor(time / LOOP);
      let rest = time - round * LOOP, beat = 0;
      while (rest >= BEATS[beat]) rest -= BEATS[beat++];
      const n = round * BEATS.length + beat;
      // The sweep brings the next look and, every other time, the next photograph
      const sweep = ease(ease(clamp((rest / BEATS[beat]) * 1.25)));
      const photoOf = (i) => textures[Math.floor(i / 2) % textures.length];
      const canvasAr = canvas.width / canvas.height;
      const draw = (i) => {
        const photo = photoOf(i);
        gl.bindTexture(gl.TEXTURE_2D, photo.tex);
        gl.uniform2f(U("cover"), Math.min(1, canvasAr / photo.ar), Math.min(1, photo.ar / canvasAr));
        apply(grades[LOOKS[i % LOOKS.length]]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      gl.uniform1f(U("time"), time);
      gl.uniform1f(U("split"), -1);
      gl.disable(gl.SCISSOR_TEST);
      draw(n);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, Math.round(canvas.width * sweep), canvas.height);
      draw(n + 1);
      gl.disable(gl.SCISSOR_TEST);
      // The rest at the end of each round carries the lab's own name
      const last = beat === BEATS.length - 1;
      label.textContent = last ? "ΔE Grade Lab" : LOOKS[(sweep > 0.5 ? n + 1 : n) % LOOKS.length];
    };
  }

  // ---------------------------------------------------------------- Ductus: layers of a real glyph
  // One letter at a time, drawn from the font's own points. Layers switch on and off in steps,
  // like the toggles in the lab, and then the letter changes.
  function ductus(canvas) {
    const { ctx, state } = setup(canvas);
    let data = null;
    fetch("/labs/glyphs.json").then((r) => r.json()).then((d) => { data = d; });
    const WORD = "Type";
    const LETTER = 0.26, PAUSE = 0.45, BACK = 0.09;
    // A run of letters set side by side as one shape
    const setWord = (text, face) => {
      const ops = [];
      let adv = 0;
      [...text].forEach((ch) => {
        const gl = face.glyphs[ch];
        gl.ops.forEach((o) => ops.push(o.map((v, i) => (i === 0 ? v : i % 2 === 1 ? v + adv : v))));
        adv += gl.adv || gl.w;  // advance with the font's own kerning
      });
      return { ops, w: adv };
    };
    const words = new Map();
    const wordOf = (text, face) => {
      const key = (face === data ? "sans:" : "serif:") + text;
      if (!words.has(key)) words.set(key, setWord(text, face));
      return words.get(key);
    };
    const STEPS = [
      { metrics: 1, outline: 1 },
      { metrics: 1, outline: 1, nodes: 1 },
      { metrics: 1, outline: 1, nodes: 1, handles: 1 },
      { metrics: 1, outline: 1, nodes: 1, coords: 1 },
      { grid: 1, outline: 1, nodes: 1, handles: 1 },
      { grid: 1, outline: 1, comb: 1 },
      { outline: 1, comb: 1, circles: 1 },
      { outline: 1, circles: 1, construction: 1 },
      { construction: 1, outline: 1, nodes: 1 },
      { bearings: 1, bbox: 1, outline: 1 },
      { bearings: 1, metrics: 1, outline: 1 },
      { metrics: 1, outline: 1, nodes: 1, handles: 1 },
      { metrics: 1, fill: 1 },
      { fill: 1 },
      { fill: 1, nodes: 1, handles: 1, invert: 1 },
      { fill: 1, construction: 1, invert: 1 },
    ];
    const STEP = 0.42;
    // Each letter's contours walked once: evenly spaced points with normal and curvature
    const cache = new Map();
    const measure = (g) => {
      if (cache.has(g)) return cache.get(g);
      if (!g.ops.length) { const empty = { samples: [], lines: [], inner: [] }; cache.set(g, empty); return empty; }
      const contours = [];
      let cur = null, x = 0, y = 0;
      const add = (px, py) => cur.push([px, py]);
      g.ops.forEach((o) => {
        if (o[0] === "M") { cur = [[o[1], o[2]]]; x = o[1]; y = o[2]; }
        else if (o[0] === "L") { for (let i = 1; i <= 12; i++) add(x + ((o[1] - x) * i) / 12, y + ((o[2] - y) * i) / 12); x = o[1]; y = o[2]; }
        else if (o[0] === "Q") { for (let i = 1; i <= 16; i++) { const u = i / 16, v = 1 - u; add(v * v * x + 2 * v * u * o[1] + u * u * o[3], v * v * y + 2 * v * u * o[2] + u * u * o[4]); } x = o[3]; y = o[4]; }
        else if (o[0] === "C") { for (let i = 1; i <= 16; i++) { const u = i / 16, v = 1 - u; add(v * v * v * x + 3 * v * v * u * o[1] + 3 * v * u * u * o[3] + u * u * u * o[5], v * v * v * y + 3 * v * v * u * o[2] + 3 * v * u * u * o[4] + u * u * u * o[6]); } x = o[5]; y = o[6]; }
        else if (cur) { contours.push(cur); cur = null; }
      });
      const area = (c) => c.reduce((a, p, i) => { const q = c[(i + 1) % c.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
      // Holes wind the opposite way to the outer shapes, whatever the number of letters
      const biggest = contours.reduce((a, c) => (Math.abs(area(c)) > Math.abs(area(a)) ? c : a), contours[0]);
      const outerSign = Math.sign(area(biggest));
      const samples = [];
      contours.forEach((c) => {
        for (let i = 0; i < c.length; i += 2) {
          const a = c[(i - 3 + c.length) % c.length], p = c[i], b = c[(i + 3) % c.length];
          const ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1];
          const lu = Math.hypot(ux, uy) || 1, lv = Math.hypot(vx, vy) || 1;
          const turn = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
          const k = turn / ((lu + lv) / 2);
          const tx = (ux / lu + vx / lv) / 2, ty = (uy / lu + vy / lv) / 2;
          const tl = Math.hypot(tx, ty) || 1;
          samples.push({ x: p[0], y: p[1], nx: -ty / tl, ny: tx / tl, k });
        }
      });
      const lines = [];
      let px = 0, py = 0;
      g.ops.forEach((o) => {
        if (o[0] === "L" && Math.hypot(o[1] - px, o[2] - py) > 60) lines.push([px, py, o[1], o[2]]);
        if (o.length > 1) { px = o[o.length - 2]; py = o[o.length - 1]; }
      });
      const m = { samples, lines, inner: contours.filter((c) => Math.sign(area(c)) !== outerSign) };
      cache.set(g, m);
      return m;
    };
    return (t) => {
      const { w, h, ink } = state;
      ctx.clearRect(0, 0, w, h);
      if (!data) return;
      // Typed letter by letter, then the layers, then deleted again
      const typing = WORD.length * LETTER + PAUSE;
      const layers = STEPS.length * STEP;
      const deleting = WORD.length * BACK + 0.3;
      const local = t % (typing + layers + deleting);
      let shown = WORD.length, on, caret = false, face = data;
      if (local < typing) {
        shown = Math.min(WORD.length, Math.floor(local / LETTER) + 1);
        on = { metrics: 1, fill: 1 };
        caret = true;
      } else if (local < typing + layers) {
        const step = Math.floor((local - typing) / STEP);
        on = STEPS[step];
        // Halfway through the layers the word changes to a serif, with its own metrics
        if (step >= Math.floor(STEPS.length / 2)) face = data.serif;
      } else {
        shown = Math.max(0, WORD.length - Math.floor((local - typing - layers) / BACK));
        on = { metrics: 1, fill: 1 };
        caret = true;
        face = data.serif;
      }
      const g = wordOf(WORD.slice(0, shown), face);
      const fullWidth = wordOf(WORD, face).w;
      const sansWidth = wordOf(WORD, data).w;
      const M = face.metrics;
      // Size and baseline come from the sans, so the serif lands on the same ground
      const scale = Math.min((h * 0.8) / (data.metrics.cap - data.metrics.desc), (w * 0.86) / sansWidth);
      const baseline = h * 0.1 + data.metrics.cap * scale;
      // The letter's origin sits on a grid line, so its coordinates can be read off the grid
      // (the whole word's width, so letters already typed stay put while the next one arrives)
      const originUnits = -Math.round(fullWidth / 2 / 100) * 100;
      const X = (x) => w / 2 + (originUnits + x) * scale;
      const GX = (x) => w / 2 + x * scale;
      const Y = (y) => baseline - y * scale;
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 1;
      const hline = (y) => { ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke(); };
      const vline = (x) => { ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke(); };

      // The ground is always there, so the letter stands on something when the layers change
      ctx.globalAlpha = on.grid ? 0.26 : 0.1;
      for (let v = -1500; v < 1500; v += 100) { hline(Y(v)); vline(GX(v)); }
      ctx.globalAlpha = 0.3;
      [M.cap, M.x, 0, M.desc].forEach((v) => hline(Y(v)));
      ctx.globalAlpha = 1;
      if (on.metrics) {
        // overshoot: round forms go slightly past the lines so they look level with the flat ones
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.globalAlpha = 0.5;
        [M.overCap, M.overX, M.overBase].forEach((v) => hline(Y(v)));
        ctx.restore();
        ctx.font = `400 ${Math.max(10, w * 0.011)}px "Almost Swiss", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        [["cap height", M.cap], ["x-height", M.x], ["baseline", 0], ["descender", M.desc]].forEach(([label, v]) => {
          ctx.globalAlpha = 0.45;
          hline(Y(v));
          ctx.globalAlpha = 0.8;
          ctx.fillText(`${label} ${v}`, 0, Y(v) - 3);
        });
        ctx.globalAlpha = 1;
      }
      const path = new Path2D();
      g.ops.forEach((o) => {
        if (o[0] === "M") path.moveTo(X(o[1]), Y(o[2]));
        else if (o[0] === "L") path.lineTo(X(o[1]), Y(o[2]));
        else if (o[0] === "Q") path.quadraticCurveTo(X(o[1]), Y(o[2]), X(o[3]), Y(o[4]));
        else if (o[0] === "C") path.bezierCurveTo(X(o[1]), Y(o[2]), X(o[3]), Y(o[4]), X(o[5]), Y(o[6]));
        else path.closePath();
      });
      const geo = measure(g);
      if (on.counters) {
        ctx.beginPath();
        geo.inner.forEach((c) => {
          c.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
          ctx.closePath();
        });
        ctx.fill();
      }
      if (on.fill) ctx.fill(path);
      if (on.bearings) {
        ctx.font = `400 ${Math.max(10, w * 0.011)}px "Almost Swiss", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.globalAlpha = 0.6;
        vline(X(0));
        vline(X(g.w));
        ctx.globalAlpha = 0.85;
        ctx.fillText("0", X(0), 2);
        ctx.fillText(`w ${g.w}`, X(g.w), 2);
        ctx.globalAlpha = 1;
      }
      if (on.bbox) {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        g.ops.forEach((o) => { for (let i = 1; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); y0 = Math.min(y0, o[i + 1]); y1 = Math.max(y1, o[i + 1]); } });
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.7;
        ctx.strokeRect(Math.round(X(x0)) + 0.5, Math.round(Y(y1)) + 0.5, Math.round((x1 - x0) * scale), Math.round((y1 - y0) * scale));
        ctx.restore();
      }
      if (on.outline) {
        ctx.lineWidth = 1.5;
        ctx.stroke(path);
        ctx.lineWidth = 1;
      }
      if (on.comb) {
        // curvature comb: the tighter the curve, the longer the tooth
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        geo.samples.forEach((p) => {
          // only real curves: straight runs have no curvature, sharp corners are not curves
          if (Math.abs(p.k) < 0.0006 || Math.abs(p.k) > 0.02) return;
          const len = 10 + Math.min(150, Math.abs(p.k) * 9000);
          const d = p.k >= 0 ? 1 : -1;
          ctx.moveTo(X(p.x), Y(p.y));
          ctx.lineTo(X(p.x + p.nx * len * d), Y(p.y + p.ny * len * d));
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }
      if (on.circles) {
        // circles that fit the curve where it turns most
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 0.75;
        geo.samples.filter((p, i) => i % 7 === 0 && Math.abs(p.k) > 0.002 && Math.abs(p.k) < 0.03).forEach((p) => {
          const r = 1 / Math.abs(p.k), d = p.k >= 0 ? 1 : -1;
          ctx.beginPath();
          ctx.arc(X(p.x + p.nx * r * d), Y(p.y + p.ny * r * d), r * scale, 0, TAU);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }
      // Over a filled letter the points are punched out in the card's colour
      const pointColour = on.invert ? getComputedStyle(canvas.parentElement.parentElement).backgroundColor : ink;
      ctx.strokeStyle = pointColour;
      ctx.fillStyle = pointColour;
      if (on.construction) {
        // every straight stroke extended across the frame
        ctx.globalAlpha = on.invert ? 0.9 : 0.5;
        ctx.lineWidth = 0.75;
        geo.lines.forEach(([x0, y0, x1, y1]) => {
          const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), e = 3000;
          ctx.beginPath();
          ctx.moveTo(X(x0 - (dx / L) * e), Y(y0 - (dy / L) * e));
          ctx.lineTo(X(x1 + (dx / L) * e), Y(y1 + (dy / L) * e));
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }
      if (on.handles) {
        let cx = 0, cy = 0;
        g.ops.forEach((o) => {
          if (o[0] === "C" || o[0] === "Q") {
            const hs = o[0] === "C" ? [[cx, cy, o[1], o[2]], [o[5], o[6], o[3], o[4]]] : [[cx, cy, o[1], o[2]], [o[3], o[4], o[1], o[2]]];
            hs.forEach(([ax, ay, bx, by]) => {
              ctx.globalAlpha = 0.75;
              ctx.beginPath();
              ctx.moveTo(X(ax), Y(ay));
              ctx.lineTo(X(bx), Y(by));
              ctx.stroke();
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.arc(X(bx), Y(by), 2.5, 0, TAU);
              ctx.fill();
            });
          }
          if (o.length > 1) { cx = o[o.length - 2]; cy = o[o.length - 1]; }
        });
      }
      if (on.nodes) {
        const s = Math.max(5, w * 0.006);
        g.ops.forEach((o) => {
          if (o.length > 1) ctx.fillRect(X(o[o.length - 2]) - s / 2, Y(o[o.length - 1]) - s / 2, s, s);
        });
      }
      if (caret && Math.floor(t * 3) % 2 === 0) {
        ctx.fillStyle = ink;
        ctx.fillRect(X(g.w) + 6, Y(M.cap + 30), Math.max(2, w * 0.002), (M.cap + 30 - M.desc) * scale);
      }
      if (on.coords) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.85;
        ctx.font = `400 ${Math.max(9, w * 0.0095)}px "Almost Swiss", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        g.ops.forEach((o, i) => {
          if (o.length > 1 && i % 3 === 0) {
            const px = o[o.length - 2], py = o[o.length - 1];
            ctx.fillText(`${px}, ${py}`, X(px) + 6, Y(py) - 3);
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
    };
  }

  const KINDS = { quarks, "u-plus": uplus, "delta-e": deltaE, ductus };
  document.querySelectorAll("canvas[data-anim]").forEach((canvas) => {
    const draw = KINDS[canvas.dataset.anim](canvas);
    let visible = true, raf = 0;
    const start = performance.now();
    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      draw((now - start) / 1000 + 2);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(canvas);
    raf = requestAnimationFrame(frame);
  });
})();
