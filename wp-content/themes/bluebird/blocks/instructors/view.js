/**
 * The instructor filter: a sport's chip shows only those who teach it; "All" shows everyone.
 */
(function () {
  document.querySelectorAll(".bb-people__filter").forEach((filter) => {
    const section = filter.closest(".bb-people");
    const chips = Array.from(filter.querySelectorAll("button"));
    const people = Array.from(section.querySelectorAll(".bb-people__list > li"));
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const sport = chip.dataset.sport;
        chips.forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
        people.forEach((person) => {
          person.hidden = sport !== "" && !person.dataset.sports.split(" ").includes(sport);
        });
      });
    });
  });
})();

/**
 * The instructors' switch: everyone, or one of their groups; its navy thumb slides to the choice.
 * The menu's address for a group (#snowboard, #ski, #freeride-touring) opens the page, or turns
 * it, to that group.
 */
(function () {
  document.querySelectorAll(".bb-people__switch").forEach((switcher) => {
    const section = switcher.closest(".bb-people");
    const options = Array.from(switcher.querySelectorAll(".bb-switch__option"));
    const thumb = switcher.querySelector(".bb-switch__thumb");
    const people = Array.from(section.querySelectorAll(".bb-people__list > li"));

    function placeThumb() {
      const pressed = options.find((option) => "true" === option.getAttribute("aria-pressed"));
      if (pressed) {
        thumb.style.setProperty("--x", pressed.offsetLeft + "px");
        thumb.style.setProperty("--w", pressed.offsetWidth + "px");
      }
    }

    function choose(option) {
      options.forEach((o) => o.setAttribute("aria-pressed", o === option ? "true" : "false"));
      people.forEach((person) => {
        person.hidden =
          "" !== option.dataset.group && person.dataset.group !== option.dataset.group;
      });
      placeThumb();
    }

    const fromAddress = () => {
      const option = options.find((o) => o.id && "#" + o.id === window.location.hash);
      if (option) {
        choose(option);
      }
    };

    options.forEach((option) => option.addEventListener("click", () => choose(option)));
    window.addEventListener("hashchange", fromAddress);
    fromAddress();

    // The thumb appears once it sits under the choice, and slides from then on.
    placeThumb();
    window.requestAnimationFrame(() => switcher.classList.add("is-ready"));
    new ResizeObserver(placeThumb).observe(switcher);
  });
})();
