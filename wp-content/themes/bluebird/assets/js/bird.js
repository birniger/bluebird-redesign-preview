/**
 * The bird from the logo lives in the top right of every page and points the way to the Book
 * button. It keeps well right of the logo, away from the middle of the page. Over the page's first
 * photo or band it only ever dips to the top edge; a page that opens with words instead lends it
 * the first line of text that reaches its side, whose top it may land on. Where the page's column
 * leaves room on the right beside a photo, it may drop a little lower there, into the free space
 * under the buttons. Mostly it sits
 * on the Book button; now and then it takes a short, slow loop and lands on that top edge or on
 * the rating badge, then comes back. It turns gently: every change of course is a curve, never a
 * jolt. It can be picked up and dropped, and glides back into its space.
 *
 * It starts only once the page has shown and the Book button is clear. Scrolling wakes it from a
 * perch; it finishes that flight before resting while the header is off screen. For visitors who
 * ask for reduced motion it simply sits on the Book button.
 */
(function () {
  if (!window.BluebirdRig) {
    return;
  }
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  // What it may land on at the top of a page: the first photo window or band with a visible edge.
  const LANDING = [
    ".bb-hero__slides",
    ".bb-opening__window",
    ".bb-opening__backdrop",
    ".bb-collage__main",
    ".bb-opening--chips",
    ".bb-route",
    ".bb-band",
    ".bb-ask__form",
    ".bb-try__window",
  ].join(", ");
  // Its size follows the screen (the stylesheet sets it: smaller on phones, larger on wide
  // screens) and is measured once it is on the page. HALF is half its width, so its centre keeps
  // this far inside the edges; LIFT is how far its centre sits above its feet, TALL its top above
  // its centre.
  let HALF = 26;
  let LIFT = 17;
  let TALL = 22;
  // How far its centre may dip over a photo's top edge.
  const DIP = 2;

  /*
   * How it flies, in one place: top speed (on wide screens and on phones), how much each flight's
   * pace may differ, the most its course may change in one frame (small: wide, calm curves), how
   * fast and how wide its wings beat, its size, how long it rests on the Book button and elsewhere
   * (seconds, the least and how much more at most), how often an outing ends on the rating
   * badge rather than a photo's edge, and how it takes a scroll: how far one quick scroll must go
   * to send it off, and how far, how high and how long a hop is (pixels, seconds). The site's values are set in the Site Editor, on the Bird
   * block in the header (blocks/bird). Adding ?bird=tune to a page's address opens a panel to try
   * others, kept only in this browser (?bird=off closes it and forgets them).
   */
  const DEFAULTS = {
    speed: 0.68,
    phoneSpeed: 0.52,
    paceMin: 0.9,
    paceMax: 1.06,
    turn: 0.016,
    flapRate: 1,
    flapWidth: 1,
    size: 1,
    homeRest: 14,
    homeRestMore: 10,
    awayRest: 7,
    awayRestMore: 5,
    badge: 0.33,
    phoneBadge: 0.4,
    flyOff: 700,
    hopSpan: 34,
    hopLift: 14,
    hopTime: 0.85,
  };
  // The site's own values, set in the Site Editor on the Bird block in the header, replace these.
  const set = document.querySelector(".bb-bird-settings");
  if (set) {
    try {
      Object.keys(DEFAULTS).forEach((key) => {
        const value = Number(JSON.parse(set.dataset.bird || "{}")[key]);
        if (Number.isFinite(value)) {
          DEFAULTS[key] = value;
        }
      });
    } catch (e) {
      // Unreadable values: the ones above stand.
    }
  }
  const T = Object.assign({}, DEFAULTS);
  const stored = (key, value) => {
    try {
      if (undefined === value) {
        return window.localStorage.getItem(key);
      }
      if (null === value) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      // Private windows may refuse storage; the defaults then stand.
    }
    return null;
  };
  const asked = new URLSearchParams(window.location.search).get("bird");
  if ("off" === asked) {
    stored("bb-bird-tune", null);
  } else if ("tune" === asked) {
    stored("bb-bird-panel", "1");
  }
  if ("off" !== asked) {
    try {
      Object.assign(T, JSON.parse(stored("bb-bird-tune") || "{}"));
    } catch (e) {
      // Unreadable values: the defaults stand.
    }
  } else {
    stored("bb-bird-panel", null);
  }
  const phone = () => document.documentElement.clientWidth < 600;
  // Its speed follows the screen: the phone speed at 390px, the wide one at 1440px, in proportion
  // between and a little beyond (at most 30% more), so it crosses a wide page as calmly as a
  // narrow one. Its turning follows the speed, so its curves keep their shape at any size.
  const SPEEDNOW = () => {
    const width = document.documentElement.clientWidth;
    const along = (width - 390) / (1440 - 390);
    const speed = T.phoneSpeed + (T.speed - T.phoneSpeed) * along;
    return Math.min(T.speed * 1.3, Math.max(T.phoneSpeed, speed));
  };
  const TURNNOW = () => T.turn * (SPEEDNOW() / 0.52);

  const whenShown = (fn) => {
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 300));
    const go = () => idle(fn, { timeout: 1500 });
    if (document.readyState === "complete") {
      go();
    } else {
      window.addEventListener("load", go, { once: true });
    }
  };

  whenShown(function start() {
    const header = document.querySelector(".bb-site-header");
    if (!header) {
      return;
    }
    const logo = header.querySelector(".bb-logo-tab");
    const book = header.querySelector(".bb-header__book .wp-block-button__link");
    const lang = header.querySelector(".bb-lang__toggle");
    const first = document.querySelector(".bb-sections > :first-child, main > :first-child");
    const badge = first ? first.querySelector(".bb-rating--badge") : null;
    const strip = first ? (first.matches(LANDING) ? first : first.querySelector(LANDING)) : null;
    // Only a headline is big enough to stand on; a small label above it is steered around.
    const heads = first
      ? Array.from(first.querySelectorAll("h1, h2"))
          .slice(0, 2)
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) >= 26)
      : [];
    const labels = first
      ? Array.from(first.querySelectorAll(".is-style-label, .bluebird-partner-kicker")).slice(0, 2)
      : [];

    // Without a photo or band up top: the first line of the opening words, measured as the text
    // itself, not the box around it.
    let pen = null;
    function firstLine() {
      for (const el of heads) {
        if (!el.getClientRects().length) {
          continue;
        }
        const range = document.createRange();
        range.selectNodeContents(el);
        // The whole first line: an italic word is a box of its own, so the first box alone stops
        // short of it.
        const boxes = Array.from(range.getClientRects());
        const first = boxes[0];
        const same = first
          ? boxes.filter((b) => Math.abs(b.top - first.top) < first.height / 2)
          : [];
        const line = first
          ? {
              left: Math.min(...same.map((b) => b.left)),
              right: Math.max(...same.map((b) => b.right)),
              top: first.top,
              height: first.height,
            }
          : null;
        if (line) {
          // Where the tops of the tall letters are, below the line's own box.
          const style = getComputedStyle(el);
          pen = pen || document.createElement("canvas").getContext("2d");
          pen.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(
            " ",
          );
          const font = pen.measureText("Hg");
          const share =
            font.fontBoundingBoxAscent / (font.fontBoundingBoxAscent + font.fontBoundingBoxDescent);
          const ink =
            line.top + line.height * share - pen.measureText("bdhk").actualBoundingBoxAscent;
          return {
            l: line.left,
            r: line.right,
            t: line.top + window.scrollY,
            ink: ink + window.scrollY,
            text: true,
            el,
          };
        }
      }
      return null;
    }

    const bird = document.createElement("div");
    bird.className = "bb-bird";
    bird.style.visibility = "hidden";
    bird.setAttribute("aria-hidden", "true");
    const rig = window.BluebirdRig(bird, { reduced: still.matches });
    // Keep the entrance outside the viewport without extending the page's scrollable width.
    // Its physics remain in document coordinates; translate compensates for the fixed layer.
    const viewport = document.createElement("div");
    viewport.className = "bb-bird-viewport";
    viewport.appendChild(bird);
    document.body.appendChild(viewport);
    const followScroll = () => {
      bird.style.translate = "0 " + -window.scrollY + "px";
    };
    followScroll();
    window.addEventListener("scroll", followScroll, { passive: true });
    const size = () => {
      bird.style.setProperty("--bb-bird-scale", String(T.size));
      const w = bird.offsetWidth || 52;
      HALF = w / 2;
      LIFT = w * (100 / 126 - 0.42);
      TALL = w * 0.42;
    };
    size();

    const shown = (el) => el && el.getClientRects().length > 0;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top + window.scrollY, b: r.bottom + window.scrollY };
    };
    const inside = (x, y, a) => x > a.l && x < a.r && y > a.t && y < a.b;

    // Where it rests when it has nowhere else to be: the Book button, or on phones, where the
    // button hides in the menu, the language switch.
    const home = () => (shown(book) ? book : shown(lang) ? lang : null);

    /*
     * The page as the bird sees it, measured afresh each frame. The zone: from a good way right of
     * the logo to the right margin, from the top down to the first photo's or band's top edge (a
     * short hop below the header where there is none). Where the page's column leaves room on the
     * right, a side strip beside it reaches a little lower. Where the page opens with words, the
     * space below the header reaches left to the end of their first line, so the bird can land on
     * it. The rating badge is steered around.
     */
    function measure() {
      const width = document.documentElement.clientWidth;
      const head = box(header);
      const mark = shown(logo) ? box(logo) : null;
      // Wing rotation can reach beyond the body box; leave room for it on narrow screens.
      const right = width - (width < 600 ? 28 + HALF : 36 + HALF / 2);
      // Never over the logo, however narrow the window: the space may shrink to a strip beside it.
      const left = Math.min(
        right - 24,
        (mark ? mark.r + (width < 600 ? 12 : 64) : width / 2) + HALF,
      );
      const cap = head.b + (width < 600 ? 170 : 250);
      // The first photo or band if it is near the top, else the first line of words.
      let land = shown(strip) ? box(strip) : null;
      if (!land || land.t > cap) {
        land = firstLine();
        // On wide screens a line of words lends itself only where it reaches the bird's own
        // space near the button; one far off on the left would draw it across the page.
        if (land && width >= 600 && land.r < left + 20) {
          land = null;
        }
      }
      if (land && land.t > cap) {
        land = null;
      }
      // A short first line is no strip to stand on (the zone would shrink to a box around the
      // button, and the bird never left it): it gets the open round instead.
      if (land && land.text && Math.min(land.r - 6, right) - Math.min(left, land.r - 40) < 16) {
        land = null;
      }
      let side = null;
      let words = null;
      // The lower flight band starts below the actual header and logo clearance. Routing and
      // the left boundary use this same height, including when the headline sits close below it.
      const belowHeader = Math.max(head.b, mark ? mark.b + 0.6 * TALL : head.b);
      if (land && land.text) {
        words = { l: Math.min(left, land.r - 40), t: belowHeader };
      }
      if (land && !land.text && width - land.r >= 2 * HALF + 28) {
        side = { l: Math.max(left, land.r + 14 + HALF), b: Math.min(cap, land.t + 120) };
      }
      let rating = shown(badge) ? box(badge) : null;
      if (rating && (rating.t > cap || rating.r < left)) {
        rating = null;
      }
      const areas = [];
      // A label over the headline it lands on: kept clear, so it never stands on the words.
      if (land && land.text) {
        labels.forEach((el) => {
          if (!shown(el)) {
            return;
          }
          const r = box(el);
          if (r.b <= land.t + 4 && r.b > land.t - 3 * TALL) {
            areas.push({ l: r.l - HALF, r: r.r + HALF, t: r.t - TALL, b: land.t });
          }
        });
      }
      if (rating) {
        areas.push({ l: rating.l - 24, r: rating.r + 24, t: rating.t - 14, b: rating.b + 20 });
      }
      // With no photo, band or line of words in reach it still gets a proper round: a good way
      // down below the header and left over the page's opening, not tiny loops at the button's
      // height (Basil, 2026-10-18).
      if (!land) {
        words = { l: Math.min(left, width * 0.35), t: belowHeader };
      }
      return {
        logo: mark,
        zone: {
          l: left,
          r: right,
          t: 24,
          floor: land
            ? land.text
              ? land.ink - LIFT + 8
              : land.t + DIP
            : head.b + (width < 600 ? 140 : 180),
          side,
          words,
        },
        land,
        rating,
        areas,
      };
    }

    // How low it may fly at x: the side strip's floor beside the column, else the top edge.
    const floorAt = (z, x) => (z.side && x >= z.side.l ? z.side.b : z.floor);
    // How far left it may fly at y: below the header, to the end of the first line of words.
    const leftAt = (z, y) => (z.words && y >= z.words.t ? z.words.l : z.l);

    // A spot on an element's top edge, inside the zone.
    function perchOn(el, zone, at = 0.18 + Math.random() * 0.64) {
      const r = box(el);
      const x = Math.min(zone.r, Math.max(zone.l, r.l + (r.r - r.l) * at));
      return { x, y: r.t - LIFT + crown(el, x) };
    }

    // How far the top of a rounded button or badge has fallen away at x: toward its ends a bird
    // standing on its top edge must stand lower, or its feet hang in the air (Basil, 2026-10-18).
    function crown(el, x) {
      const r = box(el);
      const rad = Math.min(
        parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
        (r.r - r.l) / 2,
        (r.b - r.t) / 2,
      );
      const edge = Math.min(x - r.l, r.r - x);
      if (edge >= rad) {
        return 0;
      }
      const d = rad - Math.max(0, edge);
      return rad - Math.sqrt(Math.max(0, rad * rad - d * d));
    }

    // The free stretches of the landing strip: inside the zone and clear of the badge.
    function stretches(g) {
      if (!g.land) {
        return [];
      }
      const y = g.land.t - LIFT;
      // A line of text lends its whole length; a photo keeps clear of its rounded corners.
      const inset = g.land.text ? 6 : 30;
      const from = g.land.text ? g.zone.words.l : g.zone.l;
      let parts = [[Math.max(g.land.l + inset, from), Math.min(g.land.r - inset, g.zone.r)]];
      g.areas.forEach((a) => {
        if (y <= a.t || y >= a.b) {
          return;
        }
        parts = parts.flatMap(([s, e]) => {
          const kept = [];
          if (a.l > s) {
            kept.push([s, Math.min(e, a.l)]);
          }
          if (a.r < e) {
            kept.push([Math.max(s, a.r), e]);
          }
          return kept;
        });
      });
      // A headline lends itself only where there is a fair stretch of it to stand on, not the
      // last letter or two.
      const least = g.land.text ? 16 : 24;
      return parts.filter(([s, e]) => e - s >= least).map(([s, e]) => ({ s, e, y }));
    }

    // A LatePoint booking window marks the body while it is open. The bird keeps out of its way
    // (Basil, 2026-10-18).
    const booking = () => document.body.classList.contains("latepoint-lightbox-active");
    const watchBooking = (change) =>
      new MutationObserver(change).observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });

    // Only a new width is a new layout (a zoom, a turned phone, a resized window). A phone's
    // browser bar sliding away as the page scrolls fires "resize" with the same width and a taller
    // page, and each of those would have ended a hop at once, or sent a flying bird home (Basil,
    // 2026-10-18: no hop on his iPhone).
    let layoutWidth = document.documentElement.clientWidth;
    const widthChanged = () => {
      const width = document.documentElement.clientWidth;
      if (width === layoutWidth) {
        return false;
      }
      layoutWidth = width;
      return true;
    };

    // Reduced motion: it sits on the Book button, wings folded, and moves only with the layout.
    if (still.matches) {
      const sit = () => {
        const rest = home();
        if (!rest) {
          bird.style.display = "none";
          return;
        }
        const spot = perchOn(rest, measure().zone);
        bird.style.display = "";
        rig.update();
        bird.style.transform =
          "translate(" + (spot.x - HALF) + "px," + (spot.y - TALL) + "px) scaleX(-1)";
        bird.style.visibility = "visible";
      };
      sit();
      window.addEventListener("resize", () => {
        followScroll();
        if (widthChanged()) {
          size();
          sit();
        }
      });
      watchBooking(() => (booking() ? (bird.style.display = "none") : sit()));
      return;
    }

    const startZone = measure().zone;
    // Start beyond the top right edge at every width, then fly in to the visible Book button.
    let bx = document.documentElement.clientWidth + HALF;
    let by = startZone.t - TALL;
    let vx = 0;
    let vy = 0;
    let phase = 0;
    let dir = -1;
    let tilt = 0;
    let bob = 0;
    let mode = "fly";
    let scrollFlight = false;
    // The hop under way is a lively one (a hard scroll), not a calm one (a gentle scroll, or its own).
    let hopHard = false;
    // How far it sinks onto bent legs before a calm hop, 0 to 1.
    let hopCrouch = 0;
    let tryingSince = 0;
    let landingArc = null;
    let flightProgress = null;
    let recovering = false;
    // An outing with nothing else to land on is one loop: out low towards the left, back high.
    let circuitOn = false;
    let tx = bx;
    let ty = by;
    let until = 0;
    let since = 0;
    let nextBurst = 0;
    let burst = 0;
    let held = false;
    let grabX = 0;
    let grabY = 0;
    let legs = 0;
    let lastSpot = "";
    // Slow scrolling leaves it sitting; a quick scroll makes it hop along what it sits on; only a
    // long quick one, past T.flyOff, sends it off (Basil, 2026-10-15 and -16: it left too readily).
    // One scroll is the movement until the page has been still for a moment; quick is more than
    // QUICK pixels within a moment's time.
    const QUICK = 45;
    const QUICK_MS = 150;
    // Back at the top after this long away, it flies in again as it did when the page opened.
    const AWAY_MS = 3000;
    let awaySince = 0;
    // When it last landed: the entrance again is only for a bird that sat unseen all that while.
    let perchedAt = 0;
    // When it last turned round on its perch: at most once in a while (Basil, 2026-10-18: not
    // several turns quickly one after the other).
    let turnedAt = 0;
    const TURN_GAP = 6000;
    // Now and then it turns back again a little later: a double turn, never two in a row.
    let turnBackAt = 0;
    // Its first rest after flying in is a little shorter, and it looks round more readily then
    // (Basil, 2026-10-18).
    let firstRest = false;
    // Since when its wings have been open, so it never glides straight off a perch.
    let wasOpen = false;
    let openSince = 0;
    let glideOn = false;
    let glideStart = 0;
    let glideEnd = 0;
    // At most one hop in this long, so a slow scroll does not set it bouncing.
    const HOP_REST = 1400;
    let hop = 0;
    let hopFrom = 0;
    let hopTo = 0;
    let lastHop = -Infinity;
    let hopY = 0;
    let scrollRun = null;
    let lastScrollY = window.scrollY;
    let lastX = 0;
    let pace = 1;
    let cruise = 1;
    // Held, where the pointer is on screen: scrolling while holding carries the bird along.
    let pointX = 0;
    let pointY = 0;
    // Dropped far down the page, it climbs home by a few waypoints, swaying left and right.
    let route = [];
    let weaveSeed = 0;

    const hits = (x0, y0, x1, y1, a) => {
      for (let i = 1; i <= 16; i++) {
        const s = i / 16;
        if (inside(x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, a)) {
          return true;
        }
      }
      return false;
    };

    /*
     * Where to head for now. Its space is an L: the band along the top and, beside the column, the
     * side strip; between the side strip's lower part and the band's left lies the photo. So from
     * low in the side strip it first climbs, and into it from the left it goes round the corner.
     * The badge it passes above.
     */
    function aim(g) {
      const z = g.zone;
      if (z.side) {
        const low = (y) => y > z.floor - 10;
        if (bx >= z.side.l - 8 && low(by) && tx < z.side.l) {
          return { x: bx, y: z.floor - 20 };
        }
        if (bx < z.side.l && low(ty) && tx >= z.side.l) {
          return { x: z.side.l + 12, y: z.floor - 18 };
        }
      }
      // A spot left of the band under the header cannot be flown to from up there: it first comes
      // down inside its space, then goes left, instead of pressing against the edge and turning
      // away (Basil, 2026-10-18: it should not be guided by targets it cannot reach).
      if (z.words && tx < z.l && ty >= z.words.t && by < z.words.t) {
        // Cross below the logo, then turn towards the perch. Fixed offsets used to put this
        // waypoint below a shallow headline's flight floor, so the bird circled until timeout.
        return {
          x: Math.min(z.r, z.l + HALF),
          y: Math.min(ty, z.words.t + 0.35 * HALF),
        };
      }
      if (z.words && bx < z.l && ty < z.words.t) {
        // Leaving the lower band: move clear of the logo before climbing back to the header.
        return {
          x: Math.min(z.r, z.l + HALF),
          y: Math.max(by, z.words.t + 0.35 * HALF),
        };
      }
      // The badge is an obstacle on other flights, but it must remain reachable as a perch.
      if ("badge" === lastSpot && "toPerch" === mode) {
        return { x: tx, y: ty };
      }
      for (const a of g.areas) {
        if (!hits(bx, by, tx, ty, a)) {
          continue;
        }
        const leftCorner = { x: a.l - 16, y: a.t - 14 };
        const rightCorner = { x: a.r + 16, y: a.t - 14 };
        let corner =
          Math.hypot(bx - leftCorner.x, by - leftCorner.y) <
          Math.hypot(bx - rightCorner.x, by - rightCorner.y)
            ? leftCorner
            : rightCorner;
        if (corner.x < z.l || corner.x > z.r) {
          corner = corner === leftCorner ? rightCorner : leftCorner;
        }
        return corner;
      }
      return { x: tx, y: ty };
    }

    // Its feet stand a little ahead of the middle of its box, the way it faces.
    const footShift = () => HALF * 0.16;
    // Turning round on a perch, its feet stay where they are; only its body swings round.
    function turnRound() {
      const shift = 2 * dir * footShift();
      const span = "letter" === lastSpot ? null : perchSpan();
      if ("letter" === lastSpot || (span && bx + shift >= span[0] && bx + shift <= span[1])) {
        bx += shift;
        tx += shift;
      }
      dir *= -1;
    }

    // The tall letters of the line of words it may land on, with the tops of the letters
    // themselves, so its feet stand on a letter, not on the air above the line (Basil,
    // 2026-10-18). Only those on the first line and in its free stretches.
    // What a letter looks like from above, found by drawing it large on a canvas (any font, any
    // language, nothing listed by letter): its highest points, each in em from the letter's
    // origin and in em below its very top, and how tall it is. A tall letter, or the tip of an
    // arm, or the stem of an h, or the crown of an o: wherever the ink reaches highest, the feet
    // go there, not to the middle of the box around it (Basil, 2026-10-18). Cached.
    const glyphCache = {};
    function glyphOf(letter, style) {
      const key = [style.fontStyle, style.fontWeight, style.fontFamily, letter].join("|");
      if (key in glyphCache) {
        return glyphCache[key];
      }
      const size = 120;
      const width = 300;
      const height = 280;
      const origin = 70;
      const baseline = 190;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.font = [style.fontStyle, style.fontWeight, size + "px", style.fontFamily].join(" ");
      ctx.textBaseline = "alphabetic";
      ctx.fillText(letter, origin, baseline);
      const data = ctx.getImageData(0, 0, width, height).data;
      const tops = [];
      for (let col = 0; col < width; col++) {
        let row = 0;
        while (row < height && data[(row * width + col) * 4 + 3] < 110) {
          row++;
        }
        tops.push(row < height ? row : null);
      }
      const cols = tops.map((t, c) => (null === t ? -1 : c)).filter((c) => c >= 0);
      let result = null;
      if (cols.length > 6) {
        const high = Math.min(...cols.map((c) => tops[c]));
        // Peaks: runs of columns whose top lies within a tenth of an em of the highest; a valley
        // lower than that (between the arms of a y, the stems of a u) splits them.
        const groups = [];
        let group = [];
        for (let c = cols[0]; c <= cols[cols.length - 1] + 1; c++) {
          if (null !== tops[c] && undefined !== tops[c] && tops[c] <= high + 0.1 * size) {
            group.push(c);
          } else if (group.length) {
            groups.push(group);
            group = [];
          }
        }
        const peaks = groups.map((list) => {
          const best = Math.min(...list.map((c) => tops[c]));
          const at = list.filter((c) => tops[c] <= best + 1);
          return {
            dx: (at.reduce((a, c) => a + c, 0) / at.length - origin) / size,
            dy: (best - high) / size,
          };
        });
        peaks.sort((a, b) => a.dy - b.dy);
        result = {
          peaks: peaks.slice(0, 3).sort((a, b) => a.dx - b.dx),
          rise: (baseline - high) / size,
        };
      }
      glyphCache[key] = result;
      return result;
    }
    // A tall letter reaches about as high as an h does (ascenders, capitals, figures); the rest
    // do not. Measured, not listed.
    function isTall(letter, style) {
      const g = glyphOf(letter, style);
      const h = glyphOf("h", style);
      return !!(g && h && g.rise >= 0.85 * h.rise);
    }
    // Where along a letter, and how far below its top, its feet may stand.
    function footSpots(letter, r, baseline, ink, lean, style) {
      const g = glyphOf(letter, style);
      if (g) {
        const size = parseFloat(style.fontSize);
        return g.peaks.map((t) => ({ x: r.left + t.dx * size, dy: t.dy * size }));
      }
      return [{ x: r.left + r.width / 2 + (lean * (baseline - ink)) / 2, dy: 0 }];
    }
    let perchLetter = null;
    function tallLetters(g, small = false) {
      if (!g.land || !g.land.text || !g.land.el) {
        return [];
      }
      pen = pen || document.createElement("canvas").getContext("2d");
      const free = stretches(g);
      const lineTop = g.land.t - window.scrollY;
      const range = document.createRange();
      const walker = document.createTreeWalker(g.land.el, NodeFilter.SHOW_TEXT);
      const found = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        // Each run of words in its own font: an italic word leans, so its letters' tops sit
        // further right than their middles.
        const style = getComputedStyle(node.parentElement);
        const upper = "uppercase" === style.textTransform;
        const lean = "normal" === style.fontStyle ? 0 : 0.21;
        pen.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(" ");
        const font = pen.measureText("Hg");
        const share =
          font.fontBoundingBoxAscent / (font.fontBoundingBoxAscent + font.fontBoundingBoxDescent);
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          const letter = upper ? text[i].toUpperCase() : text[i];
          if (!/[\p{L}\p{N}]/u.test(letter) || small === isTall(letter, style)) {
            continue;
          }
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (!r.width || Math.abs(r.top - lineTop) > r.height * 0.5) {
            continue;
          }
          const baseline = r.top + r.height * share;
          const ink = baseline - pen.measureText(letter).actualBoundingBoxAscent;
          for (const spot of footSpots(letter, r, baseline, ink, lean, style)) {
            if (free.some((part) => spot.x > part.s && spot.x < part.e)) {
              found.push({ x: spot.x, y: ink + spot.dy + window.scrollY });
            }
          }
        }
      }
      return found;
    }
    // Tall letters where there are any in reach; otherwise the small ones (Basil, 2026-10-18: a
    // line with only small letters near the button still lends one to land on).
    function landLetters(g) {
      const tall = tallLetters(g);
      return (tall.length ? tall : tallLetters(g, true)).concat(endLetters(g));
    }

    // The last letters of the headline's second line, where they hang out past the end of the
    // first line and under the bird's space: it can fly forwards and down to them without
    // crossing any letter, and stands at the end of a line, never between words (Basil,
    // 2026-10-18: from "lessons" to "you").
    function endLetters(g) {
      if (!g.land || !g.land.text || !g.land.el) {
        return [];
      }
      pen = pen || document.createElement("canvas").getContext("2d");
      const lineTop = g.land.t - window.scrollY;
      const range = document.createRange();
      const walker = document.createTreeWalker(g.land.el, NodeFilter.SHOW_TEXT);
      const all = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const style = getComputedStyle(node.parentElement);
        const lean = "normal" === style.fontStyle ? 0 : 0.21;
        pen.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(" ");
        const font = pen.measureText("Hg");
        const share =
          font.fontBoundingBoxAscent / (font.fontBoundingBoxAscent + font.fontBoundingBoxDescent);
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          if (!/\p{L}/u.test(text[i])) {
            continue;
          }
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (!r.width || r.top < lineTop + 0.6 * r.height) {
            continue;
          }
          const baseline = r.top + r.height * share;
          const ink = baseline - pen.measureText(text[i]).actualBoundingBoxAscent;
          for (const spot of footSpots(text[i], r, baseline, ink, lean, style)) {
            all.push({ top: r.top, x: spot.x, y: ink + spot.dy + window.scrollY });
          }
        }
      }
      if (!all.length) {
        return [];
      }
      const second = Math.min(...all.map((l) => l.top));
      const z = g.zone;
      return all
        .filter((l) => Math.abs(l.top - second) < 4)
        .sort((a, b) => a.x - b.x)
        .slice(-5)
        .filter((l) => l.x > g.land.r + 14 && l.x > (z.words ? z.words.l : z.l) && l.x < z.r)
        .map((l) => ({ x: l.x, y: l.y, second: true }));
    }
    const letterSpot = (letter) => ({ x: letter.x - dir * footShift(), y: letter.y - LIFT });

    // Where along its perch it sits, 0 to 1: along the photo's edge or line, or across the middle
    // of the button or badge where perchOn() chooses. A new layout puts it back on the same spot.
    let perchAt = 0.5;
    function notePerch() {
      const g = measure();
      if ("edge" === lastSpot || "letter" === lastSpot) {
        perchAt = g.land ? (bx - g.land.l) / (g.land.r - g.land.l || 1) : 0.5;
      } else {
        const el = "badge" === lastSpot ? badge : home();
        const r = shown(el) ? box(el) : null;
        perchAt = r ? ((bx - r.l) / (r.r - r.l || 1) - 0.18) / 0.64 : 0.5;
      }
      perchAt = Math.min(1, Math.max(0, perchAt));
    }
    function perchAgain() {
      const g = measure();
      if ("letter" === lastSpot) {
        if (!g.land) {
          return null;
        }
        const at = g.land.l + perchAt * (g.land.r - g.land.l);
        const letters = landLetters(g);
        if (!letters.length) {
          return null;
        }
        perchLetter = letters.reduce((a, b) => (Math.abs(b.x - at) < Math.abs(a.x - at) ? b : a));
        return letterSpot(perchLetter);
      }
      if ("edge" === lastSpot) {
        if (!g.land) {
          return null;
        }
        const x = g.land.l + perchAt * (g.land.r - g.land.l);
        const f = stretches(g).find((part) => x > part.s - 2 && x < part.e + 2);
        return f ? { x: Math.min(f.e, Math.max(f.s, x)), y: f.y } : null;
      }
      const el = "badge" === lastSpot ? badge : home();
      if (!shown(el)) {
        return null;
      }
      const r = box(el);
      const x = r.l + (r.r - r.l) * (0.18 + 0.64 * perchAt);
      const at = Math.min(g.zone.r, Math.max(g.zone.l, x));
      return { x: at, y: r.t - LIFT + crown(el, at) };
    }

    function goHome(now, simple = false) {
      // A direct return replaces any climb waypoints; those would keep weaving past the perch.
      route = [];
      hop = 0;
      hopY = 0;
      landingArc = null;
      flightProgress = null;
      recovering = simple;
      const rest = home();
      if (!rest) {
        pickTarget(now, true);
        return;
      }
      // A failed outing comes back to a stable middle spot, ready for a rest or a fitting hop.
      const p = simple ? perchOn(rest, measure().zone, 0.5) : perchOn(rest, measure().zone);
      tx = p.x;
      ty = p.y;
      lastSpot = "home";
      lastX = tx;
      mode = "toPerch";
      since = now;
    }

    // Where to land: back to the Book button after every outing; from the button, now and then
    // to the landing strip or the badge.
    function pickPerch(now) {
      if ("home" === lastSpot || !home()) {
        const g = measure();
        const free = stretches(g);
        // The badge on a share of outings (a little more on phones, where it is nearer), the
        // photo's edge on the rest; whichever there is when only one is.
        const share = phone() ? T.phoneBadge : T.badge;
        let spot = "";
        if (free.length && g.rating) {
          spot = Math.random() < share ? "badge" : "edge";
        } else if (free.length) {
          spot = "edge";
        } else if (g.rating) {
          spot = "badge";
        }
        let letters = "edge" === spot && g.land.text ? landLetters(g) : [];
        // In little room choose a nearby usable letter rather than randomly rejecting it and
        // repeating an empty round. A genuinely distant headline still leaves it at Book.
        if (letters.length && cramped(g.zone)) {
          letters = letters.filter((l) => Math.abs(l.x - bx) < 230);
          if (!letters.length) {
            spot = "";
          }
        }
        if (letters.length) {
          // The line first, so the few letters of the second line are not drowned by the many of
          // the first: the second 4 times in 10 (Basil, 2026-10-18: it never went to "you").
          const lower = letters.filter((letter) => letter.second);
          const upper = letters.filter((letter) => !letter.second);
          const line = lower.length && (!upper.length || Math.random() < 0.4) ? lower : upper;
          const away = line.filter((letter) => Math.abs(letter.x - lastX) > 80);
          const pool = away.length ? away : line;
          // The nearer letters more often, the end of the line by the button first: a short
          // flight down, not a dash across the headline (Basil, 2026-10-18).
          const weights = pool.map((letter) => Math.exp(-Math.abs(letter.x - bx) / 220));
          let pick = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
          let at = 0;
          while (at < pool.length - 1 && (pick -= weights[at]) > 0) {
            at++;
          }
          perchLetter = pool[at];
          const p = letterSpot(perchLetter);
          tx = p.x;
          ty = p.y;
          spot = "letter";
        } else if ("edge" === spot) {
          const total = free.reduce((sum, f) => sum + f.e - f.s, 0);
          for (let i = 0; i < 12; i++) {
            let pick = Math.random() * total;
            const f = free.find((part) => (pick -= part.e - part.s) <= 0) || free[0];
            tx = f.s + Math.random() * (f.e - f.s);
            ty = f.y;
            if (Math.abs(tx - lastX) > 80) {
              break;
            }
          }
        } else if ("badge" === spot) {
          const p = perchOn(badge, g.zone);
          tx = p.x;
          ty = p.y;
        }
        if (spot) {
          lastSpot = spot;
          lastX = tx;
          mode = "toPerch";
          since = now;
          return;
        }
      }
      goHome(now);
    }

    // A short loop: one or two turns somewhere free in its space, now and then down the side strip,
    // then a perch.
    function pickTarget(now, takeOff) {
      if (takeOff) {
        // With no other perch to go to, the outing is a proper round, not a hop and back.
        const g = measure();
        // In little room it is mostly a small flight, only now and then a whole round (Basil,
        // 2026-10-18: less space, less activity).
        const tight = cramped(g.zone);
        circuitOn = !(stretches(g).length || g.rating) && (!tight || Math.random() < 0.2);
        legs = circuitOn ? 2 : tight ? 1 : 1 + Math.floor(Math.random() * 2);
      }
      if (!takeOff && legs <= 0) {
        circuitOn = false;
        pickPerch(now);
        return;
      }
      legs--;
      const g = measure();
      const z = g.zone;
      const tight = cramped(z);
      // How far a first try must lie from where it is: a good few body lengths, but in a small
      // space no more than about half of the room there is, or every try fails and the flight
      // becomes a shuffle that looks like a hop.
      const away = tight
        ? Math.min(4 * HALF, 0.55 * Math.max(z.r - z.l, (floorAt(z, z.r) - 18 - (z.t + 10)) * 0.75))
        : 3 * HALF;
      // Somewhere free; failing that, the top right corner, which always is.
      tx = z.r - 30;
      ty = z.t + 20;
      // It prefers a spot ahead of it, so it carries on in a curve rather than stopping to
      // double back; only when nothing ahead is free does it turn round.
      const moving = !takeOff && Math.hypot(vx, vy) > 0.1;
      // The loop: one long leg out and down towards the left, one back and up, instead of a run of
      // short ups and downs (Basil, 2026-10-18).
      const from = z.words ? z.words.l : z.l;
      const high = z.t + 10;
      let low = floorAt(z, z.r) - 18;
      // Over a tight space it keeps well above the letters.
      if (tight) {
        low = high + 0.6 * (low - high);
      }
      if (circuitOn && z.r - from > 80 && low - high > 40) {
        if (1 === legs) {
          const start = z.words ? Math.max(high, z.words.t + 24) : high + 0.4 * (low - high);
          tx = from + (0.05 + 0.3 * Math.random()) * (z.r - from);
          ty = start + Math.random() * Math.max(0, low - start);
        } else {
          tx = z.r - 30 - Math.random() * 0.25 * (z.r - from);
          ty = high + Math.random() * 0.4 * (low - high);
        }
        mode = "fly";
        since = now;
        pace = T.paceMin + Math.random() * Math.max(0, T.paceMax - T.paceMin);
        return;
      }
      for (let i = 0; i < 40; i++) {
        const low = z.side && Math.random() < 0.4;
        let x = low
          ? z.side.l + Math.random() * (z.r - z.side.l)
          : z.words && Math.random() < 0.4
            ? z.words.l + Math.random() * (z.r - z.words.l)
            : z.l + Math.random() * (z.r - z.l);
        if (tight) {
          // Below the header it may go left over the page's opening, as far as its words reach.
          x = Math.min(
            z.r,
            Math.max(z.words ? z.words.l : z.l, bx + (Math.random() * 2 - 1) * 230),
          );
        }
        // Left of the logo only below the header.
        const top = x < z.l && z.words ? z.words.t + 10 : z.t + 10;
        const bottom = floorAt(z, x) - 18;
        if (bottom < top) {
          continue;
        }
        const y = top + Math.random() * (bottom - top) * (tight ? 0.75 : 1);
        // The first tries keep clear of where it is, so a leg is a flight, not a shuffle.
        const near = i < 30 && Math.hypot(x - bx, y - by) < away;
        const back =
          near ||
          (moving &&
            i < 30 &&
            (x - bx) * vx + (y - by) * vy < -0.2 * Math.hypot(vx, vy) * Math.hypot(x - bx, y - by));
        if (!back && !g.areas.some((a) => inside(x, y, a))) {
          tx = x;
          ty = y;
          break;
        }
      }
      mode = "fly";
      since = now;
      pace = T.paceMin + Math.random() * Math.max(0, T.paceMax - T.paceMin);
    }

    function takeOff(now) {
      recovering = false;
      firstRest = false;
      turnBackAt = 0;
      // With little room it mostly hops along its perch instead (Basil, 2026-10-18).
      if (
        !scrollFlight &&
        "perch" === mode &&
        !hop &&
        cramped(measure().zone) &&
        Math.random() < 0.12
      ) {
        if (startHop(now, true)) {
          until = now + 1000 * (4 + Math.random() * 5);
          return;
        }
      }
      // On a letter near the end of the headline's first line, or on one at the end of its second,
      // it may fly straight to the other: forwards and down, or back and up, crossing no letter.
      // Rare (Basil, 2026-10-18: from "lessons" to "you").
      if (!scrollFlight && "letter" === lastSpot && perchLetter && Math.random() < 0.3) {
        const g = measure();
        const nearEnd = (x) => g.land && x > g.land.r - 40 && x < g.land.r + 10;
        const all = landLetters(g);
        const to = perchLetter.second
          ? all.filter((l) => !l.second && nearEnd(l.x))
          : nearEnd(perchLetter.x)
            ? all.filter((l) => l.second)
            : [];
        if (to.length) {
          perchLetter = to[Math.floor(Math.random() * to.length)];
          const spot = letterSpot(perchLetter);
          tx = spot.x;
          ty = spot.y;
          lastX = tx;
          mode = "toPerch";
          since = now;
          tryingSince = 0;
          return;
        }
      }
      // A soft push off; the steering does the rest.
      vy = -0.15;
      pickTarget(now, true);
    }

    // Fetch the cry only on a grab. Flying past the pointer must not start an audio download.
    let cry = null;
    const cryReady = () => {
      if (!cry && window.bluebirdBirdSound) {
        cry = new Audio();
        cry.preload = "none";
        cry.src = window.bluebirdBirdSound;
        cry.volume = 0.25;
        cry.loop = true;
      }
      return cry;
    };
    const cryOut = () => {
      if (cry && !cry.paused) {
        cry.pause();
        cry.currentTime = 0;
      }
    };
    bird.addEventListener("pointerdown", (event) => {
      held = true;
      bird.classList.add("is-held");
      bird.setPointerCapture(event.pointerId);
      grabX = bx - event.clientX;
      grabY = by - (event.clientY + window.scrollY);
      pointX = event.clientX;
      pointY = event.clientY;
      route = [];
      event.preventDefault();
      if (cryReady()) {
        cry.currentTime = 0;
        const playing = cry.play();
        if (playing && playing.catch) {
          playing.catch(() => {});
        }
      }
      keepFlying();
    });
    bird.addEventListener("pointermove", (event) => {
      if (!held) {
        return;
      }
      pointX = event.clientX;
      pointY = event.clientY;
      const nx = event.clientX + grabX;
      const ny = event.clientY + window.scrollY + grabY;
      vx = (nx - bx) / 4;
      vy = (ny - by) / 4;
      bx = nx;
      by = ny;
    });
    const drop = () => {
      if (!held) {
        return;
      }
      held = false;
      hop = 0;
      hopY = 0;
      landingArc = null;
      flightProgress = null;
      recovering = false;
      cryOut();
      bird.classList.remove("is-held");
      vx *= 0.2;
      vy = -0.3;
      const now = performance.now();
      climbHome(now) || pickTarget(now, true);
      keepFlying();
    };

    // Far below its space, it does not shoot straight up: it finds its way back by a few waypoints
    // that wander, now further left, now right, now straight on, and on some climbs it circles
    // once on the way, like a bird riding a thermal.
    function climbHome(now) {
      const z = measure().zone;
      const low = by - floorAt(z, bx);
      if (low < 160) {
        return false;
      }
      const width = document.documentElement.clientWidth;
      const minX = HALF + 24;
      const maxX = width - HALF - 24;
      const clampX = (x) => Math.min(maxX, Math.max(minX, x));
      const steps = Math.max(2, Math.min(5, Math.round(low / 280)));
      const loopAt = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * (steps - 1)) : -1;
      let x = bx;
      route = [];
      for (let i = 1; i < steps; i++) {
        // Each leg climbs its share, give or take, and goes where it likes across the page,
        // never quite straight up.
        const y = by - (low * (i + (Math.random() - 0.5) * 0.4)) / steps;
        let next = clampX(x + (Math.random() - 0.5) * width * 0.6);
        if (Math.abs(next - x) < 70) {
          next = clampX(x + (next < x ? -1 : 1) * (70 + Math.random() * 60));
        }
        x = next;
        route.push({ x, y });
        if (i === loopAt) {
          // A turn round a point beside its course: four marks on a small circle.
          const r = 55 + Math.random() * 40;
          const turn = Math.random() < 0.5 ? 1 : -1;
          const cx = clampX(x + turn * r);
          for (let k = 1; k <= 4; k++) {
            const a = Math.PI + (turn * k * Math.PI) / 2;
            route.push({ x: clampX(cx + Math.cos(a) * r), y: y + Math.sin(a) * r });
          }
        }
      }
      // The last one is in its own space, from where it carries on as usual.
      route.push({ x: z.l + Math.random() * (z.r - z.l), y: floorAt(z, bx) - 40 });
      tx = route[0].x;
      ty = route[0].y;
      weaveSeed = Math.random() * 6.3;
      mode = "fly";
      legs = 1;
      since = now;
      pace = T.paceMax;
      return true;
    }
    bird.addEventListener("pointerup", drop);
    bird.addEventListener("pointercancel", drop);

    // A new layout (a zoom, a turned phone) moves the button and the edges. Sitting, it stays on
    // the same spot of its perch, as any part of the page would, instead of flying over to it
    // after every zoom step (Basil, 2026-10-18). Flying, it goes home and starts again from there.
    window.addEventListener("resize", () => {
      followScroll();
      if (!widthChanged() || held) {
        return;
      }
      size();
      if (away) {
        return;
      }
      const spot = "perch" === mode ? perchAgain() : null;
      if (spot) {
        hop = 0;
        hopY = 0;
        vx = vy = 0;
        bx = tx = lastX = spot.x;
        by = ty = spot.y;
        keepFlying();
        return;
      }
      // Never left outside a narrower page, where it would widen it.
      const z = measure().zone;
      bx = Math.min(Math.max(bx, z.l), z.r);
      goHome(performance.now());
    });

    // It moves in steps of a sixtieth of a second, however often the screen draws, so it keeps its
    // speed when Chrome saves battery (fewer frames) or a screen draws more often. A long pause, such
    // as a tab in the background, is not caught up all at once.
    const STEP = 1000 / 60;
    let lastFrame = 0;
    let owed = 0;
    function frame(now) {
      owed = lastFrame ? Math.min(owed + now - lastFrame, 4 * STEP) : STEP;
      lastFrame = now;
      while (owed > STEP / 2) {
        step(now);
        owed -= STEP;
      }
      looping =
        running || held || scrollFlight || route.length > 0 || by - measure().zone.floor > 160;
      if (looping) {
        request = window.requestAnimationFrame(frame);
      } else {
        lastFrame = 0;
      }
    }

    function step(now) {
      let energy = 0;
      let rise = 0;
      let lean = 0;
      let wingsOpen = true;
      let gliding = false;
      // How close it is to touching down (0 to 1): it brakes, pitches up and reaches with its feet.
      let nearPerch = 0;
      if (held) {
        // Near the bottom (or top) of the window the page scrolls, and the bird goes with it.
        const edgeZone = 70;
        const h = window.innerHeight;
        let step = 0;
        if (pointY > h - edgeZone) {
          step = Math.ceil(((pointY - (h - edgeZone)) / edgeZone) * 16);
        } else if (pointY < edgeZone && window.scrollY > 0) {
          step = -Math.ceil(((edgeZone - pointY) / edgeZone) * 16);
        }
        if (step) {
          window.scrollBy(0, step);
        }
        const nx = pointX + grabX;
        const ny = pointY + window.scrollY + grabY;
        if (ny !== by || nx !== bx) {
          vy = vy * 0.5 + ((ny - by) / 4) * 0.5;
        }
        bx = nx;
        by = ny;
        phase += 0.45;
        energy = 0.8;
        lean = Math.sin(now / 120) * 6;
        if (Math.abs(vx) > 0.3) {
          dir = vx < 0 ? -1 : 1;
        }
        vx *= 0.8;
        vy *= 0.8;
      } else {
        const g = measure();
        const z = g.zone;
        if ("perch" === mode || route.length) {
          flightProgress = null;
        } else {
          const distance = Math.hypot(tx - bx, ty - by);
          if (!flightProgress || flightProgress.x !== tx || flightProgress.y !== ty) {
            flightProgress = { x: tx, y: ty, distance, at: now };
          } else if (distance < flightProgress.distance - Math.max(2, 0.1 * HALF)) {
            flightProgress.distance = distance;
            flightProgress.at = now;
          } else if (now - flightProgress.at > 2200) {
            // No closer after a full turn's worth of time: stop trying the same movement.
            // A simple return follows the free corridor and settles before the next outing.
            goHome(now, true);
          }
        }
        if ("toPerch" !== mode) {
          tryingSince = 0;
          landingArc = null;
        } else {
          tryingSince = tryingSince || now;
        }
        if ("fly" === mode && route.length && Math.hypot(tx - bx, ty - by) < 45) {
          route.shift();
          if (route.length) {
            tx = route[0].x;
            ty = route[0].y;
            since = now;
          } else {
            pickTarget(now, true);
          }
        } else if ("fly" === mode && !route.length && Math.hypot(tx - bx, ty - by) < 70) {
          pickTarget(now);
        } else if (
          "toPerch" === mode &&
          !landingArc?.rising &&
          Math.hypot(tx - bx, ty - by) < 4 &&
          Math.hypot(vx, vy) < 0.14
        ) {
          tryingSince = 0;
          mode = "perch";
          perchedAt = now;
          turnBackAt = 0;
          notePerch();
          scrollFlight = false;
          if ("letter" === lastSpot && perchLetter) {
            tx = perchLetter.x - dir * footShift();
          }
          // The first rest after flying in: 10 to 18 seconds, and about one visit in four a quick
          // one, so someone new to the page may see the second flight (Basil, 2026-10-18).
          until =
            now +
            1000 *
              (firstRest
                ? Math.random() < 0.25
                  ? 4 + Math.random() * 4
                  : 10 + Math.random() * 8
                : "home" === lastSpot
                  ? (T.homeRest + Math.random() * T.homeRestMore) *
                    (cramped(measure().zone) ? 0.6 : 1)
                  : T.awayRest + Math.random() * T.awayRestMore);
        } else if ("perch" === mode && now > until) {
          takeOff(now);
        } else if (
          "perch" !== mode &&
          now - since > ("fly" === mode ? 7000 : 9000) &&
          !route.length
        ) {
          // Not there yet after a good while: something is in the way, so home it goes.
          goHome(now, true);
        }

        if ("perch" === mode && hop) {
          // A hop: a really short flight in a low arc to another spot on the same perch, wings
          // open and beating, easing off and onto it (Basil, 2026-10-16: not just up and down).
          // Its height and length follow the bird's size, as a lower arc falls faster.
          vx = vy = 0;
          by += (ty - by) * 0.15;
          const t = (now - hop) / (1000 * T.hopTime * Math.sqrt(hopScale()));
          if (t >= 1) {
            hop = 0;
            hopY = 0;
            bx = tx = lastX = hopTo;
            scrollFlight = false;
            notePerch();
            wingsOpen = false;
          } else {
            const along = t * t * (3 - 2 * t);
            bx = hopFrom + (hopTo - hopFrom) * along;
            hopY = -T.hopLift * hopScale() * (hopHard ? 1 : 0.8) * 4 * t * (1 - t);
            // Wings open on the way up and fold onto the landing.
            const open = Math.min(1, t / 0.12, (1 - t) / 0.2);
            phase += (hopHard ? 0.3 : 0.14) * T.flapRate;
            // A calm hop (its own, or a gentle scroll): the wings open and beat softly, a small
            // lean; beating hard in little room looked trapped, folded wings looked lifeless
            // (Basil, 2026-10-18).
            // A calm hop starts from a small crouch on bent legs, wings still folded.
            hopCrouch = hopHard ? 0 : Math.max(0, 1 - t / 0.14) * Math.min(1, t / 0.04 + 0.6);
            wingsOpen = open > 0.3 && (hopHard || (t > 0.2 && t < 0.7));
            energy = open * (hopHard ? 0.7 : 0.06);
            nearPerch = Math.max(0, (t - 0.6) / 0.4);
            // Nose up as it lifts, level over the top, a little up again to land.
            lean = (hopHard ? 1 : 0.5) * (-7 * (1 - 2 * t) - (t > 0.8 ? 4 * (t - 0.8) * 5 : 0));
          }
        } else if ("perch" === mode) {
          vx = vy = 0;
          bx += (tx - bx) * 0.15;
          by += (ty - by) * 0.15;
          wingsOpen = false;
          lean = 0;
          if (turnBackAt && now > turnBackAt) {
            turnRound();
            turnedAt = now;
            turnBackAt = 0;
          } else if (
            !turnBackAt &&
            now - Math.max(perchedAt, turnedAt) > TURN_GAP &&
            Math.random() < (firstRest ? 0.0016 : 0.0008)
          ) {
            turnRound();
            turnedAt = now;
            if (Math.random() < 0.4) {
              turnBackAt = now + 2500 + Math.random() * 2500;
            }
          }
        } else {
          // Towards its aim at an even speed, easing in near a perch. The course may change only
          // a little each frame, so it always turns in a curve.
          // Climbing home it keeps to its own waypoints; the corners of its space come later.
          // An awkward boundary must not trigger the old timeout snap from several body lengths
          // away. After trying for a while, make a slow direct approach to the nearby perch.
          const settling =
            "toPerch" === mode &&
            tryingSince > 0 &&
            now - tryingSince > 14000 &&
            Math.hypot(tx - bx, ty - by) < 3 * HALF;
          const target = route.length || settling ? { x: tx, y: ty } : aim(g);
          // Climbing home it weaves gently across its course, so the way up is never a ruler line;
          // slow and narrow, so the way back reads calm (Basil, 2026-10-18: "a bit too stressed").
          if (route.length) {
            const ax = target.x - bx;
            const ay = target.y - by;
            const len = Math.hypot(ax, ay) || 1;
            const weave = Math.sin(now / 1000 + weaveSeed) * Math.min(60, len * 0.4);
            target.x += (-ay / len) * weave;
            target.y += (ax / len) * weave;
          }
          const onPerch = "toPerch" === mode && target.x === tx && target.y === ty;
          // The SVG box has space above the head; keep the head in view through the crest.
          const sky = Math.min(ty, Math.max(8, TALL - 0.5 * HALF + 2));
          if (onPerch && (!landingArc || landingArc.x !== tx || landingArc.y !== ty)) {
            // From below, keep beating through a small rise past the perch, then land downward.
            // Near the top of the window the crest shrinks to the headroom actually available.
            const lift = Math.min(HALF, Math.max(0, ty - sky));
            const crest = ty - lift;
            const way = Math.sign(vx || tx - bx || dir);
            landingArc = {
              x: tx,
              y: ty,
              crest,
              side: Math.max(leftAt(z, crest), Math.min(z.r, tx + way * 0.65 * HALF)),
              rising: !settling && !recovering && by > ty + 0.2 * HALF && lift > 2,
            };
          }
          if (onPerch && landingArc.rising) {
            if (settling || by <= landingArc.crest + Math.min(3, (ty - landingArc.crest) / 3)) {
              landingArc.rising = false;
            } else {
              target.x = landingArc.side;
              target.y = landingArc.crest;
            }
          }
          const dx = target.x - bx;
          const dy = target.y - by;
          const dist = Math.hypot(dx, dy) || 1;
          const landing = onPerch && !landingArc.rising;
          if (landing && vy >= 0) {
            nearPerch = Math.max(0, 1 - Math.hypot(tx - bx, ty - by) / (5 * HALF));
          }
          cruise += (pace - cruise) * 0.01;
          // Far below its space (climbing home), it flies faster, the further the faster.
          const below = by - floorAt(z, bx);
          const climbing = route.length > 0 || below > 120;
          // A little faster on a long way home, never in a hurry.
          const boost = climbing ? 1 + Math.min(0.5, Math.max(0, below) / 4000) : 1;
          // Arrivals from beyond the page edge have their own calmer pace; normal outings and
          // their shorter landing keep the speed chosen in the editor.
          const entrance = firstRest && "toPerch" === mode;
          const topSpeed = SPEEDNOW() * cruise * boost * (entrance ? 0.7 : 1);
          const want = landing
            ? Math.min(topSpeed, 0.07 + dist / 95)
            : onPerch
              ? Math.min(topSpeed, 0.28 + dist / 110)
              : topSpeed;
          let fx = (dx / dist) * want - vx;
          let fy = (dy / dist) * want - vy;
          const force = Math.hypot(fx, fy);
          // Faster, it turns the more, so its curves keep their size.
          const most = recovering ? 0.18 : TURNNOW() * (landing ? 1.6 : 1) * boost;
          if (force > most) {
            fx *= most / force;
            fy *= most / force;
          }
          // Its space's edges push back gently, the more the further out it strays. Coming in to
          // land, the edges give way around the perch, which may lie close to one of them (the
          // button near the top, the badge just under the photo's edge).
          // Over a letter it dips below the letters' tops only barely, as it lands.
          const floor =
            "toPerch" === mode
              ? Math.max(floorAt(z, bx), target.y + (onPerch && "letter" === lastSpot ? 8 : 20))
              : floorAt(z, bx);
          const top = onPerch ? Math.min(z.t, target.y) : z.t + 20;
          const pad = onPerch ? 0 : 30;
          const edge = (over, room) => Math.min(2, Math.max(0, over) / room) * TURNNOW();
          // Climbing home by its waypoints it may leave its space; the edges wait until it is back.
          if (!route.length && !settling && !recovering) {
            fx += edge(leftAt(z, by) + pad - bx, 30) - edge(bx - (z.r - pad), 30);
            fy += edge(top - by, 20) - edge(by - (floor - 14), 14);
          }
          if (!settling && !recovering && !("badge" === lastSpot && onPerch)) {
            g.areas.forEach((a) => {
              if (inside(bx, by, a)) {
                fy -= TURNNOW();
              }
            });
          }
          // The logo is no way through and no perch: over its box, or dropped onto it, it is pushed
          // out past its right edge (Basil, 2026-10-18: it sat on the logo).
          if (g.logo && !route.length && !settling && !recovering) {
            const out = g.logo.r + 0.5 * HALF - bx;
            if (out > 8 && by < g.logo.b + 0.6 * TALL && by > g.logo.t - 0.6 * TALL) {
              fx += Math.min(2, out / 16) * TURNNOW();
            }
          }
          vx += fx;
          vy += fy;
          const speed = Math.hypot(vx, vy);
          // Obstacles and edges must respect the approach speed too, rather than pushing it
          // through a slow landing at cruise speed.
          if (speed > want) {
            vx *= want / speed;
            vy *= want / speed;
          }
          if (onPerch) {
            // Turn back down before the body can leave the window, even over the top button.
            vy = Math.max(vy, -Math.max(0, by - sky) / 12);
          }
          bx += vx * 3;
          by += vy * 3;

          // It faces where it flies, turning round only once it clearly flies the other way.
          if (vx < -0.12) {
            dir = -1;
          } else if (vx > 0.12) {
            dir = 1;
          }
          energy = Math.min(0.7, speed / 2.6 + (vy < 0 ? -vy / 2.6 : 0));
          if (now > nextBurst) {
            burst = 30;
            nextBurst = now + 8000 + Math.random() * 5000;
          }
          if (burst > 0) {
            burst--;
            energy = Math.max(energy, 0.32);
          }
          // It beats faster and a little wider when it climbs, slower when it comes down, and
          // glides only when it has almost stopped, easing into a landing. On the long way home it
          // keeps an even beat and glides between bursts, as a small bird does over a distance.
          let climb = Math.max(0, -vy) / topSpeed;
          const sink = Math.max(0, vy) / topSpeed;
          // It glides where a bird would: going down at speed, a moment after takeoff, as from
          // Book down to the badge. Level or climbing it beats its wings, and in the last stretch
          // before a perch it brakes with them (Basil, 2026-10-18). A margin keeps it from
          // flickering between the two. A glide is short and wingbeats come between glides
          // (Basil, 2026-10-18: it glided a bit unnaturally and too often).
          const carried =
            nearPerch === 0 && wasOpen && now - openSince > 1500 && speed > topSpeed * 0.6;
          // Clearly downward, about 20 degrees or more: not a nearly level glide off the button.
          const downhill = carried && vy > speed * (glideOn ? 0.15 : 0.35);
          if (glideOn && (!downhill || now - glideStart > 1200)) {
            glideOn = false;
            glideEnd = now;
          } else if (!glideOn && downhill && now - glideEnd > 2000) {
            glideOn = true;
            glideStart = now;
          }
          gliding = glideOn;
          if (climbing && !landing) {
            energy = Math.min(energy, 0.38);
            climb *= 0.3;
          }
          phase +=
            T.flapRate *
            Math.max(0.035, 0.06 + 0.14 * energy + 0.06 * climb - 0.03 * sink) *
            (0.7 + 0.3 * cruise);
          rise = gliding ? 0 : Math.sin(phase) * 2 * energy;
          lean = Math.max(-10, Math.min(10, vy * 7));
        }
      }
      if (wingsOpen && !wasOpen) {
        openSince = now;
      }
      wasOpen = wingsOpen;
      rig.update({
        flying: wingsOpen,
        beat: Math.sin(phase) * T.flapWidth,
        power: Math.min(1, 0.55 + energy),
        gliding,
        landing: nearPerch,
        crouch: hop ? hopCrouch : 0,
        headTilt: !held && "perch" === mode && !hop && Math.sin(now / 700) > 0.96 ? 6 : 0,
        balance: lean,
        time: now,
      });
      // Its tilt and the little rise and fall of its wingbeat follow softly, never snapping.
      tilt += (lean - tilt) * 0.12;
      bob += (rise - bob) * 0.2;
      // A resting glance belongs to the head; planted feet keep their perch.
      if (!held && "perch" === mode && !hop) {
        tilt = 0;
        bob = 0;
      }
      bird.style.transform =
        "translate(" +
        (bx - HALF) +
        "px," +
        (by - TALL + bob + hopY) +
        "px) scaleX(" +
        dir +
        ") rotate(" +
        tilt +
        "deg)";
      bird.style.visibility = "visible";
    }

    // Rest while the top of the page is off screen.
    // Held or on its way home from far down, it keeps going until it is back.
    let running = false;
    let looping = false;
    let request = 0;
    let arrivalReady = false;
    let away = false;
    function keepFlying() {
      if (arrivalReady && !looping) {
        looping = true;
        request = window.requestAnimationFrame(frame);
      }
    }
    const resume = () => {
      if (arrivalReady && !running && !away) {
        running = true;
        keepFlying();
      }
    };
    const rest = () => {
      running = false;
    };
    // How hard the page was moved in one go (until it has been still a moment): how far it scrolled,
    // or how hard the wheel or a finger pushed, whichever is more. So a hard push where the page
    // cannot scroll any further, at its top or bottom, still sends the bird off.
    function moved(push) {
      const now = performance.now();
      if (!scrollRun || now - scrollRun.last > 600) {
        scrollRun = { from: lastScrollY, push: 0, last: now, recent: [] };
      }
      scrollRun.last = now;
      scrollRun.push += push;
      // What moved in the last moment, the page and the wheel or finger kept apart: one wheel turn
      // reports both, and counting it twice would make a slow scroll look quick.
      scrollRun.recent.push([now, Math.abs(window.scrollY - lastScrollY), push]);
      scrollRun.recent = scrollRun.recent.filter((entry) => now - entry[0] <= QUICK_MS);
      lastScrollY = window.scrollY;
      if (held || away || "perch" !== mode) {
        return;
      }
      const page = scrollRun.recent.reduce((sum, entry) => sum + entry[1], 0);
      const pushed = scrollRun.recent.reduce((sum, entry) => sum + entry[2], 0);
      if (Math.max(page, pushed) < QUICK) {
        return;
      }
      if (Math.max(Math.abs(window.scrollY - scrollRun.from), scrollRun.push) > T.flyOff) {
        hop = 0;
        hopY = 0;
        scrollFlight = true;
        takeOff(now);
        keepFlying();
      } else if (!hop && now - lastHop > HOP_REST) {
        if (!startHop(now, false, Math.max(page, pushed) >= 3 * QUICK)) {
          scrollFlight = true;
          takeOff(now);
          keepFlying();
        }
      }
    }

    // Starts a hop to another spot on its perch; false when there is no room for one.
    function startHop(now, idle, hard) {
      hopFrom = bx;
      const spot = hopSpot(idle);
      if (null === spot) {
        return false;
      }
      hopTo = spot;
      if ("letter" !== lastSpot && "edge" !== lastSpot) {
        const el = "badge" === lastSpot ? badge : home();
        if (shown(el)) {
          ty = box(el).t - LIFT + crown(el, hopTo);
        }
      }
      if (hopTo !== hopFrom) {
        if ((hopTo > hopFrom ? 1 : -1) !== dir) {
          turnedAt = now;
        }
        dir = hopTo > hopFrom ? 1 : -1;
      }
      hop = now;
      lastHop = now;
      scrollFlight = !idle;
      hopHard = !idle && hard;
      keepFlying();
      return true;
    }

    // Where on what it sits on it may stand: the stretch of the photo's edge or line under it, or
    // the middle of the button or badge, as perchOn() chooses there.
    function perchSpan() {
      const g = measure();
      if ("edge" === lastSpot) {
        const f = stretches(g).find(
          (part) => Math.abs(part.y - ty) < 3 && tx > part.s - 2 && tx < part.e + 2,
        );
        return f ? [f.s, f.e] : null;
      }
      const el = "badge" === lastSpot ? badge : home();
      if (!shown(el)) {
        return null;
      }
      const r = box(el);
      const lo = Math.max(g.zone.l, r.l + (r.r - r.l) * 0.18);
      const hi = Math.min(g.zone.r, r.l + (r.r - r.l) * 0.82);
      return hi > lo ? [lo, hi] : null;
    }

    // The hop's size against the bird's: the values are set for the wide-screen bird (52px), and
    // on a phone the bird is 40px, so a hop as long and high looked like a leap (Basil,
    // 2026-10-17: "too big a hop" on his phone).
    function hopScale() {
      return Math.min(1, (2 * HALF) / 52);
    }

    // A hop's landing: a short way on, the way it faces, or back where there is no room ahead.
    // A step, never more than three fifths of the room it has there: on a phone's Book button it
    // used to cross from one end to the other on every hop.
    // Little room: a narrow space (a phone or a small window). It hops and takes small flights there.
    function cramped(z) {
      return z.r - (z.words ? z.words.l : z.l) < 420;
    }

    function hopSpot(idle) {
      const wide = idle ? 1.6 : 1;
      if ("letter" === lastSpot) {
        const reach = T.hopSpan * hopScale() * wide;
        const near = landLetters(measure()).filter(
          (letter) =>
            Math.abs(letter.x - (perchLetter ? perchLetter.x : bx)) >
              0.35 * T.hopSpan * hopScale() &&
            Math.abs(letter.x - bx) < reach &&
            Math.abs(letter.y - (perchLetter ? perchLetter.y : letter.y)) < 6,
        );
        if (!near.length) {
          return null;
        }
        perchLetter = near[Math.floor(Math.random() * near.length)];
        // It will face the way it hops, so its feet land on the letter.
        const way = perchLetter.x > bx ? 1 : -1;
        ty = perchLetter.y - LIFT;
        return perchLetter.x - way * footShift();
      }
      const span = perchSpan();
      if (!span) {
        return null;
      }
      if (idle) {
        // It stays well inside the button's ends.
        span[0] += 3;
        span[1] -= 3;
        if (span[1] - span[0] < 14) {
          return null;
        }
      }
      const most = Math.min(T.hopSpan * hopScale() * wide, (span[1] - span[0]) * 0.6);
      // Never a tiny hop: at least about half a normal one (Basil, 2026-10-18); where it does not
      // fit, it stays or flies.
      const least = 0.35 * T.hopSpan * hopScale();
      const reach = Math.max(least, most * (0.6 + 0.4 * Math.random()));
      const fits = (x) => x >= span[0] && x <= span[1];
      const ahead = bx + dir * reach;
      const back = bx - dir * reach;
      if (fits(ahead)) {
        return ahead;
      }
      if (fits(back)) {
        return back;
      }
      // A hop of its own accord is always a whole one, never a short run to the end of the perch
      // (Basil, 2026-10-18: the turning hops and the letter hops were fine, the others not).
      if (idle) {
        return null;
      }
      // A short perch: as far as it goes, towards the roomier end; with no real room either
      // way it flies off instead of jumping on the spot (Basil, 2026-10-18: stuck at the end
      // of Book with no room ahead or above).
      const end = span[1] - bx > bx - span[0] ? span[1] : span[0];
      return Math.abs(end - bx) < Math.max(least, 0.3 * most) ? null : end;
    }
    let touchY = null;
    window.addEventListener("scroll", () => moved(0), { passive: true });
    window.addEventListener(
      "wheel",
      (event) => moved(Math.abs(event.deltaY) * (1 === event.deltaMode ? 16 : 1)),
      { passive: true },
    );
    window.addEventListener(
      "touchstart",
      (event) => {
        touchY = event.touches.length ? event.touches[0].clientY : null;
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      (event) => {
        if (null !== touchY && event.touches.length) {
          moved(Math.abs(event.touches[0].clientY - touchY));
          touchY = event.touches[0].clientY;
        }
      },
      { passive: true },
    );
    new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) {
          awaySince = awaySince || performance.now();
          rest();
          return;
        }
        // Only a bird that sat on its perch, out of sight, the whole while flies in again. One on
        // its way back up (dragged down the page and let go) keeps flying (Basil, 2026-10-18).
        const now = performance.now();
        if (
          arrivalReady &&
          !held &&
          awaySince &&
          "perch" === mode &&
          !hop &&
          now - Math.max(awaySince, perchedAt) > AWAY_MS
        ) {
          enter();
        }
        awaySince = 0;
        resume();
      },
      { rootMargin: "160px 0px" },
    ).observe(header);

    // Its entrance again: from beyond the top right edge to the Book button.
    function enter() {
      firstRest = true;
      bx = document.documentElement.clientWidth + HALF;
      by = measure().zone.t - TALL;
      vx = vy = 0;
      hop = 0;
      hopY = 0;
      route = [];
      goHome(performance.now());
    }
    // A booking window opening: the bird fades and rests. Closed again, it flies back in.
    watchBooking(() => {
      if (booking() === away) {
        return;
      }
      away = booking();
      if (away) {
        held = false;
        cryOut();
        bird.classList.remove("is-held");
        bird.style.transition = "opacity 0.2s";
        bird.style.opacity = "0";
        rest();
        return;
      }
      bird.style.transition = "";
      bird.style.opacity = "";
      if (!arrivalReady) {
        return;
      }
      // From beyond the top right edge; out of sight below the header, it waits there and flies in
      // when the top of the page comes back.
      enter();
      if (header.getBoundingClientRect().bottom > -160) {
        resume();
      }
    });

    if ("1" === stored("bb-bird-panel")) {
      tunePanel();
    }

    // A notice may cover Book on a first phone visit. Wait until the button is visible so the
    // entrance happens in view, including after a reload or when the tab comes to the front.
    const arrive = () => {
      const target = home();
      const r = target && target.getBoundingClientRect();
      const top = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (document.visibilityState !== "visible" || !target || !target.contains(top)) {
        window.setTimeout(arrive, 250);
        return;
      }
      size();
      bx = document.documentElement.clientWidth + HALF;
      by = measure().zone.t - TALL;
      vx = vy = 0;
      arrivalReady = true;
      firstRest = true;
      goHome(performance.now());
      resume();
    };
    // A phone notice can open after load. Wait for its trigger only while it can still open;
    // the static preview and visits after dismissal start their first flight straight away.
    let noticeDelay = 0;
    const notice = document.querySelector(".pum.auto_open");
    if (phone() && window.PUM && notice) {
      try {
        const trigger = JSON.parse(notice.dataset.popmake || "{}").triggers.find(
          (item) => item.type === "auto_open",
        );
        const cookies = document.cookie.split("; ").map((cookie) => cookie.split("=")[0]);
        if (
          getComputedStyle(notice).display === "none" &&
          !trigger.settings.cookie_name.some((name) => cookies.includes(name))
        ) {
          noticeDelay = Number(trigger.settings.delay) + 200;
        }
      } catch (e) {
        noticeDelay = 1200;
      }
    }
    window.setTimeout(arrive, noticeDelay);

    // The tuning panel: a slider for each value, applied as it moves and kept in this browser.
    function tunePanel() {
      const ROWS = [
        ["speed", "Speed at 1440px", 0.3, 1.2, 0.01],
        ["phoneSpeed", "Speed at 390px", 0.3, 1, 0.01],
        ["paceMin", "Pace, slowest", 0.6, 1, 0.01],
        ["paceMax", "Pace, fastest", 1, 1.4, 0.01],
        ["turn", "Turning (higher: tighter)", 0.006, 0.04, 0.001],
        ["flapRate", "Wingbeat speed", 0.5, 2, 0.05],
        ["flapWidth", "Wingbeat width", 0.5, 1.6, 0.05],
        ["size", "Size", 0.7, 1.4, 0.05],
        ["homeRest", "Rest on Book, s", 2, 40, 1],
        ["homeRestMore", "… up to s more", 0, 30, 1],
        ["awayRest", "Rest elsewhere, s", 2, 30, 1],
        ["awayRestMore", "… up to s more", 0, 20, 1],
        ["badge", "Badge share, wide", 0, 1, 0.05],
        ["phoneBadge", "Badge share, phones", 0, 1, 0.05],
        ["flyOff", "Flies off after a scroll of, px", 200, 2000, 20],
        ["hopSpan", "Hop distance, px", 0, 80, 2],
        ["hopLift", "Hop height, px", 4, 30, 1],
        ["hopTime", "Hop length, s", 0.4, 1.6, 0.05],
      ];
      const panel = document.createElement("div");
      panel.className = "bb-bird-tune";
      panel.innerHTML =
        '<p class="bb-bird-tune__title">Bird <button type="button" data-do="hide">–</button></p>' +
        ROWS.map(
          ([key, label, min, max, step]) =>
            "<label><span>" +
            label +
            ' <output data-for="' +
            key +
            '"></output></span>' +
            '<input type="range" data-key="' +
            key +
            '" min="' +
            min +
            '" max="' +
            max +
            '" step="' +
            step +
            '"></label>',
        ).join("") +
        '<p class="bb-bird-tune__actions"><button type="button" data-do="copy">Copy values</button>' +
        '<button type="button" data-do="reset">Reset</button></p>';
      document.body.appendChild(panel);
      const show = () =>
        panel.querySelectorAll("input").forEach((input) => {
          input.value = T[input.dataset.key];
          panel.querySelector('output[data-for="' + input.dataset.key + '"]').textContent =
            T[input.dataset.key];
        });
      const save = () => {
        const changed = {};
        Object.keys(DEFAULTS).forEach((key) => {
          if (T[key] !== DEFAULTS[key]) {
            changed[key] = T[key];
          }
        });
        stored("bb-bird-tune", JSON.stringify(changed));
      };
      panel.addEventListener("input", (event) => {
        const key = event.target.dataset.key;
        if (key) {
          T[key] = Number(event.target.value);
          show();
          save();
          size();
        }
      });
      panel.addEventListener("click", (event) => {
        const action = event.target.dataset.do;
        if ("reset" === action) {
          Object.assign(T, DEFAULTS);
          stored("bb-bird-tune", null);
          show();
          size();
        } else if ("copy" === action) {
          const text = JSON.stringify(T, null, 2);
          (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => (event.target.textContent = "Copied"))
            .catch(() => window.prompt("The bird's values", text));
          window.setTimeout(() => (event.target.textContent = "Copy values"), 2000);
        } else if ("hide" === action) {
          panel.classList.toggle("is-small");
        }
      });
      show();
    }
  });
})();
