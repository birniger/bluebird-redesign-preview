/**
 * The sun in the boxes that carry the logo's ridge (the reviews band, the closing invitation, the
 * bands and openings with the sun): it
 * rises and sets slowly, and each rise and each setting takes a slightly different way, a gentle
 * arc ending a little higher or lower, a little further left or right, but always in its own corner.
 * It rests while its box is off screen and keeps still for visitors who ask for less motion (the
 * stylesheet then gives it its resting place).
 *
 * window.bluebirdSun(sun, box, path): path() returns, for the current size, the risen and the set
 * point as [x, y] offsets, how far each may wander ([x, y]), how far the arc may bow, and how long
 * one way takes.
 */
(function () {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const around = (value, spread) => value + (Math.random() * 2 - 1) * spread;

  window.bluebirdSun = function (sun, box, path) {
    if (!sun || still.matches || typeof sun.animate !== "function") {
      return;
    }
    sun.classList.add("is-drifting");
    let at = null;
    let rising = false;
    let run = null;
    let seen = false;

    const place = ([x, y]) => "translate(" + x + "px," + y + "px)";

    function leg() {
      const p = path();
      if (!at) {
        at = p.risen;
      }
      const goal = rising
        ? [around(p.risen[0], p.wander[0]), around(p.risen[1], p.wander[1])]
        : [around(p.set[0], p.wander[0]), around(p.set[1], p.wander[1])];
      // The arc bows a little to one side of the straight way, never far.
      const bow = around(0, p.bow);
      const dx = goal[0] - at[0];
      const dy = goal[1] - at[1];
      const len = Math.hypot(dx, dy) || 1;
      const frames = [];
      for (let i = 0; i <= 8; i++) {
        const s = i / 8;
        const lift = Math.sin(Math.PI * s) * bow;
        frames.push({
          transform: place([
            at[0] + dx * s + (-dy / len) * lift,
            at[1] + dy * s + (dx / len) * lift,
          ]),
        });
      }
      run = sun.animate(frames, {
        duration: around(p.duration, p.duration * 0.12),
        easing: "ease-in-out",
        fill: "forwards",
      });
      if (!seen) {
        run.pause();
      }
      run.onfinish = () => {
        at = goal;
        rising = !rising;
        leg();
      };
    }

    new IntersectionObserver((entries) => {
      seen = entries[0].isIntersecting;
      if (run) {
        seen ? run.play() : run.pause();
      }
    }).observe(box);

    // A new size may move its corner: it heads there from wherever it is.
    let width = window.innerWidth;
    window.addEventListener("resize", () => {
      if (Math.abs(window.innerWidth - width) < 40 || !run) {
        return;
      }
      width = window.innerWidth;
      run.onfinish = null;
      run.cancel();
      at = null;
      rising = false;
      leg();
    });

    leg();
  };

  // The big sun peeking over a band's or an opening's top edge beside the ridge: it climbs a
  // little into view and sinks back, a slightly different way each time.
  document.querySelectorAll(".bb-sun").forEach((sun) =>
    window.bluebirdSun(sun, sun.parentElement, () => ({
      risen: [-6, 16],
      set: [10, -20],
      wander: [10, 8],
      bow: 8,
      duration: 18000,
    })),
  );
})();
