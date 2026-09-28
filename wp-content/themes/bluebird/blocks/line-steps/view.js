/**
 * Steps in sets, such as a half and a full day: the switch shows the chosen set's stops, and its
 * navy thumb slides to the choice.
 */
(function () {
  document.querySelectorAll(".bb-steps").forEach((section) => {
    const switcher = section.querySelector(".bb-switch");
    if (!switcher) {
      return;
    }
    const options = Array.from(switcher.querySelectorAll(".bb-switch__option"));
    const thumb = switcher.querySelector(".bb-switch__thumb");
    const tracks = Array.from(section.querySelectorAll(".bb-steps__track[data-set]"));

    function placeThumb() {
      const pressed = options.find((option) => "true" === option.getAttribute("aria-pressed"));
      if (pressed) {
        thumb.style.setProperty("--x", pressed.offsetLeft + "px");
        thumb.style.setProperty("--w", pressed.offsetWidth + "px");
      }
    }

    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((o) => o.setAttribute("aria-pressed", o === option ? "true" : "false"));
        tracks.forEach((track) => {
          track.hidden = track.dataset.set !== option.dataset.set;
        });
        placeThumb();
      });
    });

    // The thumb appears once it sits under the choice, and slides from then on.
    placeThumb();
    window.requestAnimationFrame(() => switcher.classList.add("is-ready"));
    new ResizeObserver(placeThumb).observe(switcher);
  });
})();
