// Type section: typeface names fitted edge to edge in their own fonts, the current one cycling
// through its weights; on a typeface page also the tester, styles list and glyph grid.
(function () {
  // Every character in the fonts (all the typefaces share the same set)
  const GLYPHS = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¢£¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĵĶķĸĹĺĻļĽľŁłŃńŅņŇňŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžƒȘșȚțȷˆˇ˘˙˚˛˜˝ΩẀẁẂẃẄẅẼẽỲỳỸ–—‘’‚“”„†‡•…‰‹›⁄€™←↑→↓∂∅∏∑−√∞∫≈≠◊";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fit each name to the full width of its row, measured at the weight it is drawn in.
  // While hovered the row shows another line instead, never bigger than the name itself.
  const names = [...document.querySelectorAll("[data-fit]")];
  const fit = (el) => {
    el.style.fontSize = "100px";
    const width = el.scrollWidth;
    const room = el.parentElement.clientWidth;
    if (!width) return;
    let size = (100 * room) / width - 0.5;
    if (el.dataset.hovering) size = Math.min(size, Number(el.dataset.size));
    else el.dataset.size = size;
    el.style.fontSize = size + "px";
  };
  const fitAll = () => names.forEach(fit);
  document.fonts.ready.then(fitAll);
  document.fonts.addEventListener("loadingdone", fitAll);  // a weight arrived: measure again
  window.addEventListener("resize", fitAll);
  fitAll();

  // Each name steps through its weights like a flipbook, refitted on every step:
  // the current typeface all the time, the others while hovered (faster)
  names.forEach((el) => {
    const weights = el.dataset.weights.split(" ").map(Number);
    const order = weights.concat(weights.slice(0, -1).reverse().slice(0, -1));
    const rest = Number(el.dataset.rest) || weights[weights.length - 1];  // weight shown at rest
    const always = el.hasAttribute("data-cycle");
    const name = el.textContent;
    const lines = (el.dataset.hover || "").split("|").filter(Boolean);
    const link = el.parentElement;
    link.setAttribute("aria-label", name);
    el.style.fontWeight = rest;
    let i = 0, timer = null, last = -1;
    const step = () => {
      if (document.hidden) return;
      el.style.fontWeight = order[i++ % order.length];
      fit(el);
    };
    const run = (ms) => {
      window.clearInterval(timer);
      timer = reducedMotion ? null : window.setInterval(step, ms);
    };
    if (always) run(180);

    const family = getComputedStyle(link).fontFamily;
    const preload = () => weights.forEach((w) => document.fonts.load(`${w} 100px ${family}`));
    if (always) preload();
    link.addEventListener("mouseenter", () => {
      preload();
      if (lines.length) {
        let n = Math.floor(Math.random() * lines.length);
        if (n === last && lines.length > 1) n = (n + 1) % lines.length;
        last = n;
        link.style.height = link.offsetHeight + "px";  // the row keeps its height
        el.dataset.hovering = "1";
        el.textContent = lines[n];
        fit(el);
      }
      run(90);
    });
    link.addEventListener("mouseleave", () => {
      delete el.dataset.hovering;
      el.textContent = name;
      link.style.height = "";
      if (always) run(180);
      else {
        window.clearInterval(timer);
        el.style.fontWeight = rest;
      }
      fit(el);
    });
  });

  const main = document.querySelector(".type[data-styles]");
  if (!main) return;
  const STYLES = main.dataset.styles.split(" ").map((s) => {
    const [label, w] = s.split(":");
    return [label, Number(w)];
  });
  const family = main.dataset.family;

  // Tester
  const text = document.querySelector(".tester-text");
  const weights = document.querySelector(".tester-weights");
  const range = document.querySelector(".tester-size input");
  const output = document.querySelector(".tester-size output");
  const setWeight = (w) => {
    text.style.fontWeight = w;
    weights.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.weight === w)));
  };
  STYLES.forEach(([label, w]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.weight = w;
    b.style.fontWeight = w;
    b.addEventListener("click", () => setWeight(w));
    weights.appendChild(b);
  });
  range.addEventListener("input", () => {
    text.style.fontSize = range.value + "px";
    output.textContent = range.value + " px";
  });
  setWeight(STYLES.some((s) => s[1] === 400) ? 400 : STYLES[0][1]);

  // Styles list: click a row to try that weight in the tester
  const list = document.querySelector(".styles-list");
  STYLES.forEach(([label, w]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="style-name">${label}</span><span class="style-sample" style="font-weight:${w}">${family}</span><span class="style-num">${w}</span>`;
    li.title = "Try " + label + " in the tester";
    li.addEventListener("click", () => {
      setWeight(w);
      text.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    });
    list.appendChild(li);
  });

  // Glyphs
  const grid = document.querySelector(".glyph-grid");
  const big = document.querySelector(".glyph-big");
  const code = document.querySelector(".glyph-code");
  let selected = null;
  const show = (ch, button) => {
    big.textContent = ch;
    code.textContent = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0") + " · " + ch;
    if (button) {
      if (selected) selected.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", "true");
      selected = button;
    }
  };
  [...GLYPHS].forEach((ch) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ch;
    b.setAttribute("aria-label", ch);
    b.addEventListener("mouseenter", () => show(ch));
    b.addEventListener("focus", () => show(ch));
    b.addEventListener("click", () => show(ch, b));
    grid.appendChild(b);
  });
  grid.addEventListener("mouseleave", () => selected && show(selected.textContent));
})();
