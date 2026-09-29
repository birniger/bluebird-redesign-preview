/**
 * One quote at a time: the current one fades out before the next fades in, so two never overlap.
 * The sun sets across the band's full height, a slightly different way each time (assets/js/sun.js). Both rest while the band is off screen, and neither
 * moves for visitors who ask for reduced motion. A swipe, a click on either side or a dot shows another quote at once, and
 * the next waits its full time again (assets/js/swipe.js).
 */
(function () {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  function start(band) {
    const quotes = Array.from(band.querySelectorAll(".bb-reviews__quotes > blockquote"));
    const dotsBar = band.querySelector(".bb-reviews__dots");
    const interval = parseInt(band.dataset.interval, 10) || 7000;
    let current = 0;
    let timer = 0;
    let visible = false;

    const measure = () => band.style.setProperty("--bb-band-height", band.offsetHeight + "px");
    measure();
    new ResizeObserver(measure).observe(band);

    // The sun sets down the band's right side and rises again, a slightly different way each time.
    window.bluebirdSun(band.querySelector(".bb-reviews__sun"), band, () =>
      band.offsetWidth < 600
        ? {
            risen: [0, 0],
            set: [20, band.offsetHeight - 40],
            wander: [8, 14],
            bow: 10,
            duration: 28000,
          }
        : {
            risen: [0, -30],
            set: [70, band.offsetHeight - 60],
            wander: [18, 16],
            bow: 20,
            duration: 28000,
          },
    );

    if (quotes.length < 2 || !dotsBar) {
      return;
    }
    const dots = Array.from(dotsBar.querySelectorAll("button"));

    function show(index) {
      current = (index + quotes.length) % quotes.length;
      quotes.forEach((quote, i) => {
        quote.classList.toggle("is-current", i === current);
        quote.setAttribute("aria-hidden", i === current ? "false" : "true");
      });
      dots.forEach((dot, i) => dot.setAttribute("aria-pressed", i === current ? "true" : "false"));
      schedule();
    }

    function schedule() {
      window.clearTimeout(timer);
      band.classList.toggle("is-resting", !visible || document.hidden);
      if (visible && !still.matches && !document.hidden) {
        timer = window.setTimeout(() => show(current + 1), interval);
      }
    }

    dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
    window.bluebirdSwipe(band, (step) => show(current + step));
    band.querySelectorAll(".bb-turn").forEach((turn) => {
      turn.addEventListener("click", () =>
        show(current + (turn.classList.contains("bb-turn--back") ? -1 : 1)),
      );
      turn.hidden = false;
    });
    window.bluebirdSwipe.keys(dotsBar, (step) => {
      show(current + step);
      dots[current].focus();
    });
    dotsBar.hidden = false;
    quotes.forEach((quote, i) =>
      quote.setAttribute("aria-hidden", i === current ? "false" : "true"),
    );

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(band);
    document.addEventListener("visibilitychange", schedule);
    still.addEventListener("change", schedule);
  }

  document.querySelectorAll(".bb-reviews").forEach(start);
})();
