/**
 * The hero's photos cross-fade every few seconds. They stop while the hero is off screen or the
 * tab is hidden, and never move on their own for visitors who ask for reduced motion.
 */
(function () {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  function start(hero) {
    const slides = Array.from(hero.querySelectorAll(".bb-hero__slides > figure"));
    const dotsBar = hero.querySelector(".bb-hero__dots");
    if (slides.length < 2 || !dotsBar) {
      return;
    }
    const dots = Array.from(dotsBar.querySelectorAll("button"));
    const interval = parseInt(hero.dataset.interval, 10) || 7000;
    let current = 0;
    let timer = 0;
    let visible = true;

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("is-current", i === current));
      dots.forEach((dot, i) => dot.setAttribute("aria-pressed", i === current ? "true" : "false"));
      schedule();
    }

    function schedule() {
      window.clearTimeout(timer);
      if (visible && !still.matches && !document.hidden) {
        timer = window.setTimeout(() => show(current + 1), interval);
      }
    }

    dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
    dotsBar.hidden = false;

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(hero);
    document.addEventListener("visibilitychange", schedule);
    still.addEventListener("change", schedule);
    schedule();
  }

  document.querySelectorAll(".bb-hero").forEach(start);
})();
