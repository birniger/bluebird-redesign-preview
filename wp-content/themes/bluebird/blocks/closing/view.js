/**
 * The closing band's sun rests while the band is off screen, so it only moves where it is seen.
 */
(function () {
  const bands = document.querySelectorAll(".bb-closing");
  if (!bands.length || !("IntersectionObserver" in window)) {
    return;
  }
  const watch = new IntersectionObserver((entries) =>
    entries.forEach((entry) => entry.target.classList.toggle("is-resting", !entry.isIntersecting)),
  );
  bands.forEach((band) => {
    band.classList.add("is-resting");
    watch.observe(band);
  });
})();
