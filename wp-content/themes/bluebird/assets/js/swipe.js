/**
 * A sideways swipe, by finger or by dragging with the mouse, for the things that move on their own
 * (the hero's photos, the reviews band's quotes): to the left shows the next, to the right the one
 * before. Up and down still scroll the page, and a swipe that ends in selected text is a selection.
 *
 * window.bluebirdSwipe(area, step): step(1) for the next, step(-1) for the one before.
 */
(function () {
  window.bluebirdSwipe = function (area, step) {
    let start = null;
    let swiped = 0;

    area.style.touchAction = "pan-y";
    area.addEventListener("dragstart", (event) => event.preventDefault());
    // A swipe isn't a click on the link or the side it happened to start on.
    area.addEventListener(
      "click",
      (event) => {
        if (Date.now() - swiped < 400) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );

    area.addEventListener("pointerdown", (event) => {
      if (event.isPrimary && event.button === 0) {
        start = { x: event.clientX, y: event.clientY };
      }
    });
    area.addEventListener("pointercancel", () => (start = null));
    area.addEventListener("pointerup", (event) => {
      if (!start || !event.isPrimary) {
        return;
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        return;
      }
      if (String(window.getSelection())) {
        return;
      }
      swiped = Date.now();
      step(dx < 0 ? 1 : -1);
    });
  };

  // The dots' row: the arrow keys move along it, as in any row of choices.
  window.bluebirdSwipe.keys = function (dotsBar, step) {
    dotsBar.addEventListener("keydown", (event) => {
      const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (move) {
        event.preventDefault();
        step(move, true);
      }
    });
  };
})();
