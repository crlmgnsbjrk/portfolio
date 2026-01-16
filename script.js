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

  if (!header) {
    startTitleMarquee();
    return;
  }

  function parseColor(color) {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) {
      return null;
    }
    const parts = match[1].split(",").map((part) => part.trim());
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  }

  function getBackgroundColor(el) {
    let current = el;
    while (current && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const bg = style.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        return parseColor(bg);
      }
      current = current.parentElement;
    }
    return parseColor(window.getComputedStyle(document.body).backgroundColor);
  }

  function updateHeaderColor() {
    const rect = header.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = Math.min(window.innerHeight - 1, rect.bottom + 1);
    const stack = document.elementsFromPoint(x, y);
    const under = stack.find((el) => el !== header && !header.contains(el)) || stack[0];
    const isMedia = under && (under.closest("img") || under.closest(".thumb") || under.closest(".media"));

    if (isMedia) {
      header.classList.toggle("header-dark", false);
      header.classList.toggle("header-light", true);
      return;
    }

    const rgb = getBackgroundColor(under);

    if (!rgb) {
      return;
    }

    const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    const isLight = luminance > 0.6;

    header.classList.toggle("header-dark", isLight);
    header.classList.toggle("header-light", !isLight);
  }

  const onScroll = () => window.requestAnimationFrame(updateHeaderColor);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateHeaderColor();
  startTitleMarquee();

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
})();
