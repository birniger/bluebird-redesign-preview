/**
 * The hero's photos cross-fade every few seconds. They stop while the hero is off screen or the
 * tab is hidden, and never move on their own for visitors who ask for reduced motion. A swipe, a
 * click on either side or a dot shows another at once, and the next waits its full time again (assets/js/swipe.js).
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
    window.bluebirdSwipe(hero.querySelector(".bb-hero__slides"), (step) => show(current + step));
    // The arrows keep clear of the glass card where it lies on the photo.
    const card = hero.querySelector(".bb-hero__card");
    if (card) {
      const clear = () => hero.style.setProperty("--bb-hero-card", card.offsetHeight + "px");
      clear();
      new ResizeObserver(clear).observe(card);
    }
    hero.querySelectorAll(".bb-turn").forEach((turn) => {
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
