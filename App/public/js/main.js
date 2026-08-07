/* MaternityCare+ — shared interactions */
(function () {
  // Scroll-reveal
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Mobile sidebar
  const menuBtn = document.querySelector(".menu-btn");
  const sidebar = document.querySelector(".sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        !menuBtn.contains(e.target)
      )
        sidebar.classList.remove("open");
    });
  }

  // Animated counters (elements with data-count)
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const decimals = el.dataset.decimals
      ? parseInt(el.dataset.decimals, 10)
      : 0;
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const cio = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          animateCount(e.target);
          cio.unobserve(e.target);
        }
    },
    { threshold: 0.4 },
  );
  document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));

  // Toast helper + auto-toast from data attribute on body
  window.showToast = (msg, icon = "✅") => {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 3200);
  };
  const auto = document.body.dataset.toast;
  if (auto) setTimeout(() => window.showToast(auto), 350);

  // Progress bars animate to their target width on reveal
  document.querySelectorAll(".progress > span[data-w]").forEach((sp) => {
    const pio = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            sp.style.width = sp.dataset.w + "%";
            pio.disconnect();
          }
      },
      { threshold: 0.3 },
    );
    sp.style.width = "0%";
    pio.observe(sp);
  });

