/**
 * Settings to try. The small window loads its copy of the settings page once it comes near the
 * screen, drawn at a desktop's width and scaled down to fit. A click opens the large window, a
 * dialog whose copy loads then and can be clicked through; there it is drawn at the window's own
 * width, scaled down only where the screen is narrower than a desktop's. Escape, the button or a
 * click beside the window closes it.
 */
(function () {
  const DESK = 1180;

  // Draws a frame at the width it is meant for and scales it to its screen.
  function fit(screen, frame, least) {
    const width = screen.clientWidth;
    const height = screen.clientHeight;
    const scale = width < least ? 1 : Math.min(1, width / DESK);
    frame.style.width = width / scale + "px";
    frame.style.height = height / scale + "px";
    frame.style.transform = 1 === scale ? "" : "scale(" + scale + ")";
  }

  const load = (frame) => {
    if (!frame.src) {
      frame.src = frame.dataset.src;
    }
  };

  document.querySelectorAll(".bb-try").forEach((section) => {
    const small = section.querySelector(".bb-try__window");
    const dialog = section.querySelector(".bb-try__large");
    if (!small || !dialog) {
      return;
    }
    const smallScreen = small.querySelector(".bb-try__screen");
    const smallFrame = small.querySelector(".bb-try__frame");
    const largeScreen = dialog.querySelector(".bb-try__screen");
    const largeFrame = dialog.querySelector(".bb-try__frame");

    // The small window always shows the desktop page, however narrow it is.
    const fitSmall = () => fit(smallScreen, smallFrame, 0);
    fitSmall();
    new ResizeObserver(fitSmall).observe(smallScreen);
    // The large one shows the phone page on a phone.
    const fitLarge = () => fit(largeScreen, largeFrame, 760);
    new ResizeObserver(fitLarge).observe(largeScreen);

    if ("IntersectionObserver" in window) {
      const watch = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            load(smallFrame);
            watch.disconnect();
          }
        },
        { rootMargin: "400px 0px" },
      );
      watch.observe(small);
    } else {
      load(smallFrame);
    }

    small.addEventListener("click", () => {
      load(largeFrame);
      dialog.showModal();
      document.documentElement.classList.add("has-bb-sheet");
      fitLarge();
    });
    const close = () => dialog.close();
    dialog.querySelector(".bb-try__close").addEventListener("click", close);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        close();
      }
    });
    dialog.addEventListener("close", () => {
      document.documentElement.classList.remove("has-bb-sheet");
      small.focus();
    });
  });
})();
