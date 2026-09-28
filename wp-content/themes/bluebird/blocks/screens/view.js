/**
 * Screens: choosing a topic shows its screenshot (arrow keys move between topics); a click on the
 * screenshot opens it larger in a dialog, which Escape or the button closes.
 */
(function () {
  document.querySelectorAll(".bb-screens").forEach((section) => {
    const tabs = Array.from(section.querySelectorAll(".bb-screens__tab"));
    const panels = Array.from(section.querySelectorAll(".bb-screens__panel"));
    const dialog = section.querySelector(".bb-screens__lightbox");
    const large = section.querySelector(".bb-screens__large");

    function select(index, focus) {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        panels[i].classList.toggle("is-current", on);
      });
      if (focus) {
        tabs[index].focus();
      }
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(i, false));
      tab.addEventListener("keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (step) {
          event.preventDefault();
          select((i + step + tabs.length) % tabs.length, true);
        }
      });
    });

    section.querySelectorAll(".bb-screens__zoom").forEach((button) => {
      button.addEventListener("click", () => {
        const img = button.querySelector("img");
        if (!img || !dialog) {
          return;
        }
        const copy = img.cloneNode();
        copy.removeAttribute("sizes");
        copy.removeAttribute("srcset");
        copy.loading = "eager";
        large.replaceChildren(copy);
        dialog.showModal();
      });
    });

    if (dialog) {
      dialog.querySelector(".bb-screens__close").addEventListener("click", () => dialog.close());
      // A click on the dim backdrop closes it too.
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          dialog.close();
        }
      });
    }
  });
})();
