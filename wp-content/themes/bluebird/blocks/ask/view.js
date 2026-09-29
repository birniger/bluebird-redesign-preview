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

/**
 * The days asked about: instead of typing them, each day is picked from the calendar, with the
 * time from and until as the guest likes (any time, or left open), and as many days as they need.
 * What they pick is written into the form's own "when" field in plain words ("Sat 14 Feb 2027,
 * 09:00–12:00; Sun 15 Feb 2027, any time"), so the email reads as before; without scripts the
 * field stays as it was. A day a link brought along (?when=…) stays on top until removed.
 */
(function () {
  const lang = document.documentElement.lang || "en";
  const text = {
    day: /^de/.test(lang) ? "Tag" : "Day",
    from: /^de/.test(lang) ? "von" : "from",
    until: /^de/.test(lang) ? "bis" : "until",
    add: /^de/.test(lang) ? "Weiteren Tag hinzufügen" : "Add another day",
    remove: /^de/.test(lang) ? "Diesen Tag entfernen" : "Remove this day",
    any: /^de/.test(lang) ? "jederzeit" : "any time",
    asked: /^de/.test(lang) ? "Angefragt" : "Asked about",
    optional: /^de/.test(lang)
      ? "Zuerst den Tag wählen; die Zeit ist freiwillig."
      : "Pick the day first; the time is optional.",
  };
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const dateWords = (iso) =>
    // Written the way the Swiss write them: Sat 23 Jan 2027, Sa., 23. Jan. 2027.
    new Date(iso + "T12:00:00").toLocaleDateString(/^de/.test(lang) ? "de-CH" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  document.querySelectorAll(".bb-ask__form").forEach((card) => {
    const field = card.querySelector('input[name="when"]');
    const label = field && field.closest("label");
    if (!field || !label) {
      return;
    }
    const heading = label.querySelector(".bb-field__label");
    const picker = document.createElement("div");
    picker.className = "bb-days";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", heading ? heading.textContent : text.day);
    picker.innerHTML =
      '<p class="bb-field__label">' +
      (heading ? heading.textContent : "") +
      '</p><p class="bb-days__hint">' +
      text.optional +
      '</p><ul class="bb-days__summary" aria-live="polite"></ul><div class="bb-days__rows"></div><button type="button" class="bb-days__add">+ ' +
      text.add +
      "</button>";
    label.hidden = true;
    label.after(picker);
    const rows = picker.querySelector(".bb-days__rows");
    const summary = picker.querySelector(".bb-days__summary");
    let brought = "";

    // One chip in the summary, with a button to take it away.
    const chip = (words, remove) => {
      const item = document.createElement("li");
      item.innerHTML =
        '<span></span><button type="button" class="bb-days__remove" aria-label="' +
        text.remove +
        '">×</button>';
      item.querySelector("span").textContent = words;
      item.querySelector("button").addEventListener("click", remove);
      return item;
    };

    // The days picked, as words: written into the form's field and shown on top as chips, each
    // as soon as its day is picked, with its time once there is one.
    function write() {
      summary.textContent = "";
      if (brought) {
        summary.appendChild(
          chip(text.asked + ": " + brought, () => {
            brought = "";
            write();
          }),
        );
      }
      const days = [];
      Array.from(rows.children).forEach((row) => {
        const [date, from, until] = row.querySelectorAll("input");
        row.classList.toggle("has-day", !!date.value);
        if (!date.value) {
          return;
        }
        let time = text.any;
        if (from.value && until.value) {
          time = from.value + "–" + until.value;
        } else if (from.value) {
          time = text.from + " " + from.value;
        } else if (until.value) {
          time = text.until + " " + until.value;
        }
        const words = dateWords(date.value) + ", " + time;
        days.push(words);
        summary.appendChild(chip(words, () => removeRow(row)));
      });
      summary.hidden = !summary.children.length;
      field.value = [brought].concat(days).filter(Boolean).join("; ").slice(0, 400);
    }

    function removeRow(row) {
      if (rows.children.length > 1) {
        row.remove();
      } else {
        row.querySelectorAll("input").forEach((input) => (input.value = ""));
      }
      write();
    }

    function addRow() {
      const row = document.createElement("div");
      row.className = "bb-days__row";
      row.innerHTML =
        '<label class="bb-days__date"><span class="screen-reader-text">' +
        text.day +
        '</span><input type="date" min="' +
        today +
        '"></label><label class="bb-days__time"><span>' +
        text.from +
        '</span><input type="time" step="900"></label><label class="bb-days__time"><span>' +
        text.until +
        '</span><input type="time" step="900"></label><button type="button" class="bb-days__remove" aria-label="' +
        text.remove +
        '">×</button>';
      rows.appendChild(row);
      return row;
    }

    function start() {
      rows.textContent = "";
      brought = field.defaultValue || field.value || "";
      addRow();
      write();
    }

    picker.addEventListener("input", write);
    picker.addEventListener("change", write);
    picker.addEventListener("click", (event) => {
      if (event.target.closest(".bb-days__add")) {
        addRow().querySelector("input").focus();
        write();
      } else if (event.target.closest(".bb-days__row .bb-days__remove")) {
        removeRow(event.target.closest(".bb-days__row"));
      }
    });
    // After a request is sent the form starts over, and so do the days.
    const form = card.querySelector("form");
    if (form) {
      form.addEventListener("reset", () => window.setTimeout(start, 0));
    }
    start();
  });
})();
