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

/**
 * The row of instructors scrolls sideways when they don't all fit. The track and the arrows show
 * only then: the track's thumb follows the row; the arrows step one card at a time and rest at
 * either end. A new choice in the switch or filter starts the row at its beginning.
 */
(function () {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll(".bb-people").forEach((section) => {
    const list = section.querySelector(".bb-people__list");
    const arrows = section.querySelector(".bb-people__arrows");
    if (!list || !arrows) {
      return;
    }
    const [back, on] = Array.from(arrows.querySelectorAll(".bb-people__arrow"));
    const track = arrows.querySelector(".bb-people__track");
    const thumb = arrows.querySelector(".bb-people__thumb");

    function update() {
      const room = list.scrollWidth - list.clientWidth;
      arrows.hidden = room <= 2;
      back.disabled = list.scrollLeft <= 2;
      on.disabled = list.scrollLeft >= room - 2;
      // The thumb: as long as the share of the row in view, as far along as the row has moved.
      if (track && thumb && room > 2) {
        const share = list.clientWidth / list.scrollWidth;
        const width = track.clientWidth * share;
        thumb.style.setProperty("--w", width + "px");
        thumb.style.setProperty(
          "--x",
          (track.clientWidth - width) * Math.min(1, list.scrollLeft / room) + "px",
        );
      }
    }

    const step = () => {
      const card = Array.from(list.children).find((li) => !li.hidden);
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : list.clientWidth;
    };

    arrows.querySelectorAll(".bb-people__arrow").forEach((arrow) =>
      arrow.addEventListener("click", () =>
        list.scrollBy({
          left: Number(arrow.dataset.step) * step(),
          behavior: still.matches ? "auto" : "smooth",
        }),
      ),
    );
    list.addEventListener("scroll", update, { passive: true });
    new ResizeObserver(update).observe(list);
    section.querySelectorAll(".bb-switch__option, .bb-people__filter button").forEach((choice) =>
      choice.addEventListener("click", () => {
        list.scrollLeft = 0;
        window.requestAnimationFrame(update);
      }),
    );
    update();
  });
})();
