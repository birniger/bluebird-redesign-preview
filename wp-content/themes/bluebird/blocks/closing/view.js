/**
 * The closing band's sun rises ahead of the ridge's bird and sets towards the corner, a slightly
 * different way each time (assets/js/sun.js); it only moves while the band is seen.
 */
(function () {
  const narrow = window.matchMedia("(max-width: 999px)");
  document.querySelectorAll(".bb-closing").forEach((band) => {
    window.bluebirdSun(band.querySelector(".bb-closing__sun"), band, () =>
      narrow.matches
        ? { risen: [-4, -44], set: [24, 56], wander: [10, 10], bow: 10, duration: 22000 }
        : { risen: [-6, -96], set: [40, 64], wander: [16, 14], bow: 16, duration: 22000 },
    );
  });
})();
