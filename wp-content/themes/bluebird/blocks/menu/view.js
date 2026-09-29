/**
 * The header menu.
 *
 * Wide screens: a panel opens on hover and stays a moment after the pointer leaves, so moving down
 * into it never closes it. A click or Enter toggles it, Arrow Down opens it and steps into the
 * first entry, Escape closes it and returns to its entry, and it closes when focus or a click moves
 * elsewhere. One panel is open at a time.
 *
 * Phones: the round button opens the menu as a full-screen sheet (a modal dialog, so the page
 * behind it is out of reach); Escape, the close button or choosing an entry closes it.
 *
 * Photo tiles with several slides show one at a time: while their panel or the sheet is open they
 * take turns, and the tile links to the slide showing. The instructors come in a new random order
 * each time, so no one is always first; pointing at one of their groups shows only that group's
 * portraits, in turn if there are several. The arrows on its sides or a swipe skip ahead or
 * back, and the next turn waits its full time again. For visitors who ask for less motion they
 * change only when a group is pointed at or skipped by hand.
 */
(function () {
  const wide = window.matchMedia("(min-width: 1000px)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const LEAVE_DELAY = 160;
  const TURN = 3600;

  document.querySelectorAll(".bb-nav").forEach((nav) => {
    const items = Array.from(nav.querySelectorAll(".bb-nav__item.has-panel"));
    let leaveTimer = 0;
    // A panel a mouse opened by hovering stays open when its entry is then clicked; touch
    // screens send no hover, so a tap simply toggles.
    let hoverOpened = null;

    nav.classList.add("is-enhanced");

    const tiles = new Map();
    nav.querySelectorAll("[data-slides]").forEach((tile) => {
      const slides = Array.from(tile.querySelectorAll("[data-url]"));
      const part = tile.closest(".bb-nav__panel, .bb-sheet__group") || tile;
      const team = slides.some((slide) => slide.dataset.group);
      let order = slides;
      let current = slides[0];
      let timer = 0;
      let held = false;
      let only = "";

      // A fresh order for the instructors each time the tile opens; other tiles keep theirs.
      const shuffle = (list) => {
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      };

      // The slides taking turns: all, or the group pointed at.
      const pool = () => {
        const group = order.filter((slide) => slide.dataset.group === only);
        return only && group.length ? group : order;
      };

      function show(slide) {
        current = slide;
        slides.forEach((s) => {
          s.classList.toggle("is-current", s === slide);
          if (s === slide) {
            s.removeAttribute("aria-hidden");
          } else {
            s.setAttribute("aria-hidden", "true");
          }
        });
        tile.setAttribute("href", slide.dataset.url);
      }

      function next(step = 1) {
        const list = pool();
        show(list[(list.indexOf(current) + step + list.length) % list.length]);
      }

      function run() {
        window.clearInterval(timer);
        if (!still.matches) {
          timer = window.setInterval(() => held || next(), TURN);
        }
      }

      const skip = (step) => {
        next(step);
        run();
      };
      const frame = tile.closest(".bb-nav__tile") || tile;
      frame.querySelectorAll(".bb-turn").forEach((turn) => {
        turn.addEventListener("click", () =>
          skip(turn.classList.contains("bb-turn--back") ? -1 : 1),
        );
        turn.hidden = false;
      });
      window.bluebirdSwipe(tile, skip);

      part.querySelectorAll("a[data-group]").forEach((entry) => {
        const pick = () => {
          only = entry.dataset.group;
          if (current.dataset.group !== only) {
            show(pool()[0]);
          }
        };
        const free = () => {
          only = "";
        };
        entry.addEventListener("pointerenter", pick);
        entry.addEventListener("focus", pick);
        entry.addEventListener("pointerleave", free);
        entry.addEventListener("blur", free);
      });
      frame.addEventListener("pointerenter", () => {
        held = true;
      });
      frame.addEventListener("pointerleave", () => {
        held = false;
      });

      tiles.set(tile, {
        start() {
          window.clearInterval(timer);
          only = "";
          order = team ? shuffle(slides) : slides;
          show(order[0]);
          run();
        },
        stop() {
          window.clearInterval(timer);
        },
      });
    });
    const turn = (root, on) =>
      root
        .querySelectorAll("[data-slides]")
        .forEach((tile) => tiles.get(tile)[on ? "start" : "stop"]());

    function setOpen(target) {
      items.forEach((item) => {
        const open = item === target;
        if (open !== item.classList.contains("is-open")) {
          turn(item, open);
        }
        item.classList.toggle("is-open", open);
        item.querySelector(".bb-nav__top").setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    items.forEach((item) => {
      const top = item.querySelector(".bb-nav__top");

      item.addEventListener("pointerenter", (event) => {
        if ("mouse" !== event.pointerType || !wide.matches) {
          return;
        }
        window.clearTimeout(leaveTimer);
        if (!item.classList.contains("is-open")) {
          hoverOpened = item;
        }
        setOpen(item);
      });
      item.addEventListener("pointerleave", (event) => {
        if ("mouse" !== event.pointerType || !wide.matches) {
          return;
        }
        leaveTimer = window.setTimeout(() => {
          hoverOpened = null;
          setOpen(null);
        }, LEAVE_DELAY);
      });
      top.addEventListener("click", () => {
        if (hoverOpened === item) {
          hoverOpened = null;
          return;
        }
        setOpen(item.classList.contains("is-open") ? null : item);
      });
      top.addEventListener("keydown", (event) => {
        if ("ArrowDown" === event.key) {
          event.preventDefault();
          setOpen(item);
          const first = item.querySelector(".bb-nav__panel a");
          // The panel is still hidden in the frame it opens in; step in once it shows.
          if (first) {
            window.requestAnimationFrame(() => window.setTimeout(() => first.focus(), 30));
          }
        }
      });
      item.addEventListener("focusout", (event) => {
        if (!item.contains(event.relatedTarget) && item.classList.contains("is-open")) {
          turn(item, false);
          item.classList.remove("is-open");
          top.setAttribute("aria-expanded", "false");
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if ("Escape" !== event.key) {
        return;
      }
      const open = items.find((item) => item.classList.contains("is-open"));
      if (open) {
        setOpen(null);
        open.querySelector(".bb-nav__top").focus();
      }
    });
    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target)) {
        setOpen(null);
      }
    });

    // The phone sheet.
    const opener = nav.querySelector(".bb-nav__open");
    const sheet = nav.querySelector(".bb-sheet");
    if (!opener || !sheet || typeof sheet.showModal !== "function") {
      return;
    }
    const root = document.documentElement;

    function openSheet() {
      sheet.classList.remove("is-closing");
      sheet.showModal();
      root.classList.add("has-bb-sheet");
      opener.setAttribute("aria-expanded", "true");
      turn(sheet, true);
    }

    function closeSheet() {
      if (!sheet.open || sheet.classList.contains("is-closing")) {
        return;
      }
      const finish = () => {
        sheet.classList.remove("is-closing");
        sheet.close();
        root.classList.remove("has-bb-sheet");
        opener.setAttribute("aria-expanded", "false");
        turn(sheet, false);
      };
      if (still.matches) {
        finish();
        return;
      }
      sheet.classList.add("is-closing");
      window.setTimeout(finish, 220);
    }

    opener.setAttribute("aria-expanded", "false");
    opener.addEventListener("click", openSheet);
    sheet.querySelector(".bb-sheet__close").addEventListener("click", closeSheet);
    sheet.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeSheet();
    });
    sheet.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSheet));
    wide.addEventListener("change", () => {
      if (wide.matches && sheet.open) {
        sheet.close();
        root.classList.remove("has-bb-sheet");
        turn(sheet, false);
      }
    });
  });
})();
