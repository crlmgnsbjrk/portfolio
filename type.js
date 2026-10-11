// Type page: the name cycles through the weights, a tester, the styles list and the glyph grid.
(function () {
  const STYLES = [
    ["Thin", 100], ["ExtraLight", 200], ["Light", 300], ["Regular", 400], ["Medium", 500],
    ["SemiBold", 600], ["Bold", 700], ["ExtraBold", 800], ["Black", 900],
  ];
  // Every character in the font (from the OTF's character map)
  const GLYPHS = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¢£¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĵĶķĸĹĺĻļĽľŁłŃńŅņŇňŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžƒȘșȚțȷˆˇ˘˙˚˛˜˝ΩẀẁẂẃẄẅẼẽỲỳỸ–—‘’‚“”„†‡•…‰‹›⁄€™←↑→↓∂∅∏∑−√∞∫≈≠◊";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hero: step through the weights like a flipbook, then rest on Black
  const name = document.querySelector("[data-cycle]");
  if (name && !reducedMotion) {
    const order = STYLES.map((s) => s[1]).concat(STYLES.map((s) => s[1]).reverse().slice(1));
    let i = 0;
    window.setInterval(() => {
      if (document.hidden) return;
      name.style.fontWeight = order[i % order.length];
      i++;
    }, 180);
  }

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
  setWeight(400);

  // Styles list: click a row to try that weight in the tester
  const list = document.querySelector(".styles-list");
  STYLES.forEach(([label, w]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="style-name">${label}</span><span class="style-sample" style="font-weight:${w}">Almost Swiss</span><span class="style-num">${w}</span>`;
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
