/**
 * The request form in a popup. A "Contact …" button (data-bb-ask) opens it addressed to that
 * instructor alone, their name in the headline and the choice of "Who should answer?" out of
 * sight; for the school, the choice shows with "Any of us".
 * Escape, the close button or a click beside the form closes it, and focus returns to the button.
 */
(function () {
  const popup = document.querySelector(".bb-ask-popup:not(.bb-signup-popup)");
  if (!popup || typeof popup.showModal !== "function") {
    return;
  }
  const title = popup.querySelector(".bb-intro__title");
  const choose = popup.querySelector('select[name="instructor"]');
  let opener = null;

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bb-ask]");
    if (!button) {
      return;
    }
    event.preventDefault();
    opener = button;
    const name = button.dataset.bbAsk || "";
    const first = name.split(" ")[0];
    if (title) {
      title.textContent = first
        ? title.dataset.titleOne.replace("%s", first)
        : title.dataset.titleAny;
    }
    if (choose) {
      const option = Array.from(choose.options).find((o) => o.value === name);
      choose.value = option ? option.value : choose.options[0].value;
      // Addressed to one instructor, the form goes to them alone: the choice is out of sight.
      const field = choose.closest(".bb-field");
      if (field) {
        field.hidden = !!option;
        field.parentElement.classList.toggle("has-one", !!option);
      }
    }
    popup.showModal();
    document.documentElement.classList.add("has-bb-sheet");
  });

  closable(popup, () => opener);
})();

/**
 * Signing up for a posted date: a date's "Sign up" (data-bb-signup) opens the short form, the
 * date's name and days on top and sent along with the form.
 */
(function () {
  const popup = document.querySelector(".bb-signup-popup");
  if (!popup || typeof popup.showModal !== "function") {
    return;
  }
  let opener = null;
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bb-signup]");
    if (!button) {
      return;
    }
    event.preventDefault();
    opener = button;
    popup.querySelector(".bb-intro__title").textContent = button.dataset.bbSignupTitle || "";
    popup.querySelector(".bb-signup__when").textContent = button.dataset.bbSignupWhen || "";
    const date = popup.querySelector('input[name="date"]');
    if (date) {
      date.value = button.dataset.bbSignup;
    }
    popup.showModal();
    document.documentElement.classList.add("has-bb-sheet");
  });
  closable(popup, () => opener);
})();

/**
 * A form popup closes with Escape, its button or a click beside it, and gives focus back to the
 * button that opened it.
 *
 * @param {HTMLDialogElement} popup  The popup.
 * @param {Function}          opener Returns the button that opened it.
 */
function closable(popup, opener) {
  popup.querySelector(".bb-ask-popup__close").addEventListener("click", () => popup.close());
  popup.addEventListener("click", (event) => {
    if (event.target === popup) {
      popup.close();
    }
  });
  popup.addEventListener("close", () => {
    document.documentElement.classList.remove("has-bb-sheet");
    if (opener()) {
      opener().focus();
    }
  });
}
