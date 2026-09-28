/**
 * The request form: a link can choose its topic and fill in the day (?topic=touring&when=…#ask),
 * so a "Request a tour" button lands on the form already half filled in. ("when", not "day":
 * WordPress reads "day" as a date archive.)
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get("topic");
  const when = params.get("when");
  if (!topic && !when) {
    return;
  }
  const slug = (text) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  document.querySelectorAll(".bb-ask__form").forEach((card) => {
    if (topic) {
      const choice = Array.from(card.querySelectorAll('input[type="radio"]')).find(
        (input) => slug(input.value) === slug(topic),
      );
      if (choice) {
        // As the default too: on a cached page the form plugin resets the form once loaded.
        choice.defaultChecked = true;
        choice.checked = true;
      }
    }
    const field = card.querySelector('input[name="when"]');
    if (when && field && !field.value) {
      field.defaultValue = when.slice(0, 120);
      field.value = field.defaultValue;
    }
  });
})();
