(function () {
  const linkColors = ["#3604FE", "#24DD4F", "#F4452A", "#852AF4"];
  const randomColor = linkColors[Math.floor(Math.random() * linkColors.length)];
  document.documentElement.style.setProperty("--link-color", randomColor);

  const header = document.querySelector(".site-header");
  const year = document.getElementById("y");
  const originalTitle = document.title;
  let titleIndex = 0;

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // Swap pixelated placeholders for the real image once it has loaded
  document.documentElement.classList.add("js");
  document.querySelectorAll("img[data-lqip]").forEach((img) => {
    const done = () => img.classList.add("is-loaded");
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener("load", done, { once: true });
  });
  document.querySelectorAll("video[data-lqip]").forEach((video) => {
    const poster = new Image();
    poster.onload = () => video.classList.add("is-loaded");
    poster.src = video.poster;
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  initTextMode();
  initLoadMeter();
  initScrambleNav();
  initDitherCards();
  initTileShows();
  initSoundToggles();

  // Press T: the whole site as a 90s text-only browser would render it
  function initTextMode() {
    const root = document.documentElement;
    document.querySelectorAll("img, video").forEach((el) => {
      const label = el.tagName === "IMG" ? el.alt : el.getAttribute("aria-label");
      if (!label) return;
      const alt = document.createElement("span");
      alt.className = "text-mode-alt";
      alt.textContent = (el.tagName === "IMG" ? "[IMG] " : "[VIDEO] ") + label;
      (el.parentElement.tagName === "PICTURE" ? el.parentElement : el).after(alt);
    });
    const apply = (on) => {
      root.classList.toggle("text-mode", on);
      try {
        on ? sessionStorage.setItem("textMode", "1") : sessionStorage.removeItem("textMode");
      } catch (e) {}
    };
    try {
      if (sessionStorage.getItem("textMode")) apply(true);
    } catch (e) {}
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() !== "t" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      apply(!root.classList.contains("text-mode"));
    });
  }

  // Netscape-style status bar: [████░░░░░░] 4/10 while the images in view load, then "Done"
  function initLoadMeter() {
    const media = [...document.querySelectorAll("img[data-lqip], video[data-lqip]")];
    if (!media.length || !("IntersectionObserver" in window)) return;
    const meter = document.createElement("div");
    meter.className = "load-meter is-done";
    meter.setAttribute("aria-hidden", "true");
    document.body.appendChild(meter);

    const requested = new Set();
    let hideTimer;
    const render = () => {
      const total = requested.size;
      const loaded = [...requested].filter((el) => el.classList.contains("is-loaded")).length;
      if (!total) return;
      window.clearTimeout(hideTimer);
      if (loaded < total) {
        const cells = Math.round((loaded / total) * 10);
        meter.textContent = `Loading [${"█".repeat(cells)}${"░".repeat(10 - cells)}] ${loaded}/${total}`;
        meter.classList.remove("is-done");
      } else if (!meter.classList.contains("is-done")) {
        meter.textContent = "Done";
        hideTimer = window.setTimeout(() => meter.classList.add("is-done"), 900);
      }
    };
    // Roughly the distance at which browsers start lazy-loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.isIntersecting && requested.add(entry.target));
        render();
      },
      { rootMargin: "1200px 0px" }
    );
    const changes = new MutationObserver(render);
    media.forEach((el) => {
      observer.observe(el);
      changes.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // Menu links flicker through random characters before settling on hover
  function initScrambleNav() {
    if (!header || reducedMotion) return;
    const glyphs = "!<>-_\\/[]{}=+*^?#%&@$";
    header.querySelectorAll("nav a").forEach((link) => {
      const original = link.textContent;
      if (!/[a-z]/i.test(original)) return;
      let running = false;
      link.addEventListener("mouseenter", () => {
        if (running) return;
        running = true;
        link.style.minWidth = link.offsetWidth + "px";
        let frame = 0;
        const frames = original.length * 3;
        (function tick() {
          link.textContent = [...original]
            .map((c, i) => (i < frame / 3 || c === " " ? c : glyphs[Math.floor(Math.random() * glyphs.length)]))
            .join("");
          if (frame++ < frames) {
            window.setTimeout(tick, 28);
          } else {
            link.textContent = original;
            link.style.minWidth = "";
            running = false;
          }
        })();
      });
    });
  }

  // Muted autoplay films (video[data-sound]) get a button that turns the sound on and starts over
  function initSoundToggles() {
    document.querySelectorAll("video[data-sound]").forEach((video) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sound-toggle";
      button.textContent = "♪";
      // Only the note is shown; struck through while muted. The label carries the words.
      const label = () => {
        button.classList.toggle("is-muted", video.muted);
        button.setAttribute("aria-label", video.muted ? "Sound on" : "Sound off");
        button.title = video.muted ? "Sound on" : "Sound off";
      };
      label();
      button.addEventListener("click", () => {
        video.muted = !video.muted;
        if (!video.muted) {
          video.currentTime = 0;
          video.play();
        }
        label();
      });
      video.after(button);
    });
  }

  // Pattern slideshows: data-tiles lists image paths without extension; AVIF with a JPEG fallback
  function initTileShows() {
    document.querySelectorAll(".tile-show[data-tiles]").forEach((show) => {
      const layers = show.dataset.tiles.trim().split(/\s+/).map((path) => {
        const layer = document.createElement("div");
        layer.className = "tile-layer";
        layer.style.backgroundImage =
          `image-set(url("${path}.avif") type("image/avif"), url("${path}.jpg") type("image/jpeg"))`;
        if (!layer.style.backgroundImage) layer.style.backgroundImage = `url("${path}.jpg")`;
        show.appendChild(layer);
        return layer;
      });
      if (!layers.length) return;
      let current = 0;
      layers[0].classList.add("is-active");
      if (layers.length < 2) return;
      window.setInterval(() => {
        if (document.hidden) return;
        layers[current].classList.remove("is-active");
        current = (current + 1) % layers.length;
        layers[current].classList.add("is-active");
      }, 3000);
    });
  }

  // Card images turn into 1-bit Atkinson-dithered pictures on hover, like an old Mac screen
  function initDitherCards() {
    document.querySelectorAll(".card .thumb").forEach((thumb) => {
      const img = thumb.querySelector("img");
      if (!img) return;
      let canvas = null;
      thumb.addEventListener("mouseenter", () => {
        if (canvas || !img.complete || !img.naturalWidth) return;
        canvas = ditherImage(img, thumb.clientWidth, thumb.clientHeight);
        thumb.appendChild(canvas);
      });
    });
  }

  function ditherImage(img, boxW, boxH) {
    const pixel = 2; // each dither dot is 2x2 screen pixels
    const w = Math.max(1, Math.round(boxW / pixel));
    const h = Math.max(1, Math.round(boxH / pixel));
    const canvas = document.createElement("canvas");
    canvas.className = "dither";
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // object-fit: cover
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);

    const image = ctx.getImageData(0, 0, w, h);
    const px = image.data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      gray[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
    }
    const spread = (x, y, err) => {
      if (x >= 0 && x < w && y < h) gray[y * w + x] += err;
    };
    const dark = [17, 17, 17];
    const light = [246, 246, 244];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const on = gray[i] >= 128;
        const err = (gray[i] - (on ? 255 : 0)) / 8;
        spread(x + 1, y, err);
        spread(x + 2, y, err);
        spread(x - 1, y + 1, err);
        spread(x, y + 1, err);
        spread(x + 1, y + 1, err);
        spread(x, y + 2, err);
        const c = on ? light : dark;
        px[i * 4] = c[0];
        px[i * 4 + 1] = c[1];
        px[i * 4 + 2] = c[2];
        px[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  if (!header) {
    startTitleMarquee();
    return;
  }

  // Header text tone: the logo and the menu each turn black or white, whichever contrasts more with
  // what is actually behind them. Behind an image or video that is read from its embedded pixel
  // placeholder (see lqip.py), so light images get black text and dark ones white.
  const toneTargets = [header.querySelector(".brand"), header.querySelector("nav")].filter(Boolean);
  const placeholders = new WeakMap();

  function parseColor(color) {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) {
      return null;
    }
    const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }

  // Relative luminance (WCAG) of an sRGB colour, 0 = black, 1 = white
  function luminance(r, g, b) {
    const lin = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  // Background colour of an element, blending semi-transparent layers onto what is below them
  function backgroundLuminance(el) {
    const layers = [];
    for (let current = el; current; current = current.parentElement) {
      const color = parseColor(window.getComputedStyle(current).backgroundColor);
      if (color && color[3] > 0) {
        layers.push(color);
        if (color[3] >= 1) break;
      }
    }
    let rgb = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) {
      const [r, g, b, a] = layers[i];
      rgb = [r * a + rgb[0] * (1 - a), g * a + rgb[1] * (1 - a), b * a + rgb[2] * (1 - a)];
    }
    return luminance(rgb[0], rgb[1], rgb[2]);
  }

  // Luminance of an image or video at a point on screen, from its placeholder; null if the point
  // falls outside the picture (letterboxing) or the placeholder is not decoded yet
  function mediaLuminance(el, x, y) {
    const data = placeholders.get(el);
    if (!data) return null;
    const rect = el.getBoundingClientRect();
    const naturalW = Number(el.getAttribute("width")) || el.naturalWidth || el.videoWidth;
    const naturalH = Number(el.getAttribute("height")) || el.naturalHeight || el.videoHeight;
    if (!naturalW || !naturalH) return null;

    let w = rect.width;
    let h = rect.height;
    const fit = window.getComputedStyle(el).objectFit;
    if (fit === "cover" || fit === "contain") {
      const scaleX = rect.width / naturalW;
      const scaleY = rect.height / naturalH;
      const scale = fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
      w = naturalW * scale;
      h = naturalH * scale;
    }
    const u = (x - rect.left - (rect.width - w) / 2) / w;
    const v = (y - rect.top - (rect.height - h) / 2) / h;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;

    const i = (Math.floor(v * data.height) * data.width + Math.floor(u * data.width)) * 4;
    return luminance(data.data[i], data.data[i + 1], data.data[i + 2]);
  }

  function luminanceAt(x, y) {
    const under = document.elementsFromPoint(x, y).find((el) => el !== header && !header.contains(el));
    if (!under) return null;
    if (under.tagName === "IMG" || under.tagName === "VIDEO") {
      const fromMedia = mediaLuminance(under, x, y);
      if (fromMedia !== null) return fromMedia;
      return backgroundLuminance(under.parentElement);
    }
    return backgroundLuminance(under);
  }

  function updateHeaderColor() {
    toneTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // A small grid of points over the text itself
      let sum = 0;
      let count = 0;
      for (const fx of [0.1, 0.5, 0.9]) {
        for (const fy of [0.3, 0.7]) {
          const value = luminanceAt(rect.left + rect.width * fx, rect.top + rect.height * fy);
          if (value !== null) {
            sum += value;
            count++;
          }
        }
      }
      if (!count) return;
      const L = sum / count;
      const dark = (L + 0.05) / 0.05 >= 1.05 / (L + 0.05); // black text contrasts more than white
      target.classList.toggle("tone-dark", dark);
      target.classList.toggle("tone-light", !dark);
    });
  }

  // Decode every placeholder once into pixels, then re-evaluate the header
  Promise.all(
    [...document.querySelectorAll("[data-lqip]")].map(
      (el) =>
        new Promise((resolve) => {
          const match = el.style.backgroundImage.match(/url\("?(data:[^")]+)"?\)/);
          if (!match) return resolve();
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            placeholders.set(el, ctx.getImageData(0, 0, canvas.width, canvas.height));
            resolve();
          };
          img.onerror = resolve;
          img.src = match[1];
        })
    )
  ).then(() => window.requestAnimationFrame(updateHeaderColor));

  const onScroll = () => window.requestAnimationFrame(updateHeaderColor);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateHeaderColor();
  startTitleMarquee();

  initProjectNav();
  initStockholmTime();

  function initProjectNav() {
    const nav = document.querySelector("[data-project-nav]");
    if (!nav) {
      return;
    }
    const match = window.location.pathname.match(/p-(\d+)\.html$/);
    if (!match) {
      return;
    }
    const current = Number(match[1]);
    const prev = current - 1;
    const next = current + 1;
    const maxProject = 4;
    const prevLink = nav.querySelector("[data-prev]");
    const nextLink = nav.querySelector("[data-next]");

    if (prevLink) {
      if (prev < 1) {
        prevLink.href = `p-${maxProject}.html`;
      } else {
        prevLink.href = `p-${prev}.html`;
      }
    }

    if (nextLink) {
      if (next > maxProject) {
        nextLink.href = "p-1.html";
      } else {
        nextLink.href = `p-${next}.html`;
      }
    }
  }

  function startTitleMarquee() {
    if (!originalTitle) {
      return;
    }
    const padding = " · ";
    const text = originalTitle + padding;
    window.setInterval(() => {
      titleIndex = (titleIndex + 1) % text.length;
      document.title = text.slice(titleIndex) + text.slice(0, titleIndex);
    }, 200);
  }

  function initStockholmTime() {
    const time = document.getElementById("stockholm-time");
    if (!time) {
      return;
    }
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
      timeZoneName: "short",
    });

    function updateTime() {
      const now = new Date();
      time.textContent = formatter.format(now);
      time.dateTime = now.toISOString();
    }

    updateTime();
    window.setInterval(updateTime, 60000);
  }
})();
