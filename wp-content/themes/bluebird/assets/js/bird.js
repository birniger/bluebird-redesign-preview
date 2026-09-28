/**
 * The bird from the logo lives in the top right of every page and points the way to the Book
 * button. It keeps well right of the logo, away from the middle of the page. Over the page's first
 * photo or band it only ever dips to the top edge; where the page's column leaves room on the
 * right, it may drop a little lower there, into the free space under the buttons. Mostly it sits
 * on the Book button; now and then it takes a short, slow loop and lands on that top edge or on
 * the rating badge, then comes back. It turns gently: every change of course is a curve, never a
 * jolt. It can be picked up and dropped, and glides back into its space.
 *
 * It starts only once the page has shown, rests while the header is off screen, and for visitors
 * who ask for reduced motion it simply sits on the Book button.
 */
(function () {
  const settings = window.bluebirdBird || {};
  if (!settings.src) {
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
  ].join(", ");
  // Half the bird's width: its centre keeps this far inside the edges.
  const HALF = 26;
  // How it flies: its top speed, the most its course may change in one frame (small: wide, calm
  // curves), and how far its centre may dip over a photo's top edge.
  const SPEED = 0.6;
  const TURN = 0.016;
  const DIP = 2;

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

    const bird = document.createElement("div");
    bird.className = "bb-bird";
    bird.setAttribute("aria-hidden", "true");
    ["bb-bird__far-wing", "bb-bird__body", "bb-bird__wing"].forEach((part) => {
      const img = document.createElement("img");
      img.src = settings.src;
      img.alt = "";
      img.className = part;
      img.draggable = false;
      bird.appendChild(img);
    });
    document.body.appendChild(bird);
    const wing = bird.querySelector(".bb-bird__wing");
    const farWing = bird.querySelector(".bb-bird__far-wing");

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
     * right, a side strip beside it reaches a little lower. The rating badge is steered around.
     */
    function measure() {
      const width = document.documentElement.clientWidth;
      const head = box(header);
      const mark = shown(logo) ? box(logo) : null;
      const right = width - (width < 600 ? 14 : 36) - HALF / 2;
      const left = Math.min(
        right - 60,
        (mark ? mark.r + (width < 600 ? 12 : 64) : width / 2) + HALF,
      );
      const cap = head.b + (width < 600 ? 170 : 250);
      let land = shown(strip) ? box(strip) : null;
      if (land && land.t > cap) {
        land = null;
      }
      let side = null;
      if (land && width - land.r >= 2 * HALF + 28) {
        side = { l: Math.max(left, land.r + 14 + HALF), b: Math.min(cap, land.t + 120) };
      }
      let rating = shown(badge) ? box(badge) : null;
      if (rating && (rating.t > cap || rating.r < left)) {
        rating = null;
      }
      const areas = [];
      if (rating) {
        areas.push({ l: rating.l - 24, r: rating.r + 24, t: rating.t - 14, b: rating.b + 20 });
      }
      return {
        zone: { l: left, r: right, t: 24, floor: land ? land.t + DIP : head.b + 20, side },
        land,
        rating,
        areas,
      };
    }

    // How low it may fly at x: the side strip's floor beside the column, else the top edge.
    const floorAt = (z, x) => (z.side && x >= z.side.l ? z.side.b : z.floor);

    // A spot on an element's top edge, inside the zone.
    function perchOn(el, zone) {
      const r = box(el);
      const x = r.l + (r.r - r.l) * (0.18 + Math.random() * 0.64);
      return { x: Math.min(zone.r, Math.max(zone.l, x)), y: r.t - 17 };
    }

    // The free stretches of the landing strip: inside the zone and clear of the badge.
    function stretches(g) {
      if (!g.land) {
        return [];
      }
      const y = g.land.t - 17;
      let parts = [[Math.max(g.land.l + 30, g.zone.l), Math.min(g.land.r - 30, g.zone.r)]];
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
      return parts.filter(([s, e]) => e - s >= 24).map(([s, e]) => ({ s, e, y }));
    }

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
        wing.style.transform = "rotate(-68deg) scaleY(.55)";
        farWing.style.transform = "rotate(-64deg) scaleY(.5) translate(-3px,-1px)";
        bird.style.transform =
          "translate(" + (spot.x - HALF) + "px," + (spot.y - 22) + "px) scaleX(-1)";
      };
      sit();
      window.addEventListener("resize", sit);
      return;
    }

    const startZone = measure().zone;
    let bx = startZone.r - 40;
    let by = startZone.t + 30;
    let vx = 0;
    let vy = 0;
    let phase = 0;
    let dir = -1;
    let tilt = 0;
    let bob = 0;
    let wingAngle = -30;
    let mode = "fly";
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
    let lastX = 0;

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

    function goHome(now) {
      const rest = home();
      if (!rest) {
        pickTarget(now, true);
        return;
      }
      const p = perchOn(rest, measure().zone);
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
        const away = [];
        if (free.length) {
          away.push("edge", "edge");
        }
        if (g.rating) {
          away.push("badge");
        }
        const spot = away[Math.floor(Math.random() * away.length)];
        if ("edge" === spot) {
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
        legs = 1 + Math.floor(Math.random() * 2);
      }
      if (!takeOff && legs <= 0) {
        pickPerch(now);
        return;
      }
      legs--;
      const g = measure();
      const z = g.zone;
      // Somewhere free; failing that, the top right corner, which always is.
      tx = z.r - 30;
      ty = z.t + 20;
      for (let i = 0; i < 30; i++) {
        const low = z.side && Math.random() < 0.4;
        const x = low
          ? z.side.l + Math.random() * (z.r - z.side.l)
          : z.l + Math.random() * (z.r - z.l);
        const y = z.t + 10 + Math.random() * Math.max(0, floorAt(z, x) - 18 - z.t - 10);
        if (!g.areas.some((a) => inside(x, y, a))) {
          tx = x;
          ty = y;
          break;
        }
      }
      mode = "fly";
      since = now;
    }

    bird.addEventListener("pointerdown", (event) => {
      held = true;
      bird.classList.add("is-held");
      bird.setPointerCapture(event.pointerId);
      grabX = bx - event.clientX;
      grabY = by - (event.clientY + window.scrollY);
      event.preventDefault();
    });
    bird.addEventListener("pointermove", (event) => {
      if (!held) {
        return;
      }
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
      bird.classList.remove("is-held");
      vx *= 0.2;
      vy = -0.3;
      pickTarget(performance.now(), true);
    };
    bird.addEventListener("pointerup", drop);
    bird.addEventListener("pointercancel", drop);

    // A new layout moves the button and the edges: it goes home and starts again from there.
    window.addEventListener("resize", () => {
      if (!held) {
        goHome(performance.now());
      }
    });

    function frame(now) {
      let energy = 0;
      let rise = 0;
      let lean = 0;
      if (held) {
        phase += 0.45;
        wingAngle = -30 + 40 * Math.sin(phase);
        wing.style.transform = "rotate(" + wingAngle + "deg)";
        farWing.style.transform = "rotate(" + (wingAngle * 0.8 - 6) + "deg) translate(-4px,-2px)";
        lean = Math.sin(now / 120) * 6;
        if (Math.abs(vx) > 0.3) {
          dir = vx < 0 ? -1 : 1;
        }
        vx *= 0.8;
        vy *= 0.8;
      } else {
        const g = measure();
        const z = g.zone;
        if ("fly" === mode && Math.hypot(tx - bx, ty - by) < 70) {
          pickTarget(now);
        } else if ("toPerch" === mode && Math.hypot(tx - bx, ty - by) < 5) {
          mode = "perch";
          until =
            now +
            ("home" === lastSpot ? 14000 + Math.random() * 10000 : 7000 + Math.random() * 5000);
        } else if ("perch" === mode && now > until) {
          // A soft push off; the steering does the rest.
          vy = -0.15;
          pickTarget(now, true);
        } else if ("perch" !== mode && now - since > ("fly" === mode ? 7000 : 9000)) {
          // Not there yet after a good while: something is in the way, so home it goes.
          goHome(now);
        }

        if ("perch" === mode) {
          vx = vy = 0;
          bx += (tx - bx) * 0.15;
          by += (ty - by) * 0.15;
          wingAngle += (-68 - wingAngle) * 0.3;
          wing.style.transform = "rotate(" + wingAngle + "deg) scaleY(.55)";
          farWing.style.transform =
            "rotate(" + (wingAngle + 4) + "deg) scaleY(.5) translate(-3px,-1px)";
          lean = Math.sin(now / 700) > 0.96 ? 8 : 0;
          if (Math.random() < 0.0008) {
            dir *= -1;
          }
        } else {
          // Towards its aim at an even speed, easing in near a perch. The course may change only
          // a little each frame, so it always turns in a curve.
          const target = aim(g);
          const dx = target.x - bx;
          const dy = target.y - by;
          const dist = Math.hypot(dx, dy) || 1;
          const landing = "toPerch" === mode && target.x === tx && target.y === ty;
          const want = landing ? Math.min(SPEED, 0.1 + dist / 160) : SPEED;
          let fx = (dx / dist) * want - vx;
          let fy = (dy / dist) * want - vy;
          const force = Math.hypot(fx, fy);
          const most = TURN * (landing ? 1.6 : 1);
          if (force > most) {
            fx *= most / force;
            fy *= most / force;
          }
          // Its space's edges push back gently, the more the further out it strays. Coming in to
          // land, the edges give way around the perch, which may lie close to one of them (the
          // button near the top, the badge just under the photo's edge).
          const floor = landing ? Math.max(floorAt(z, bx), ty + 20) : floorAt(z, bx);
          const top = landing ? Math.min(z.t, ty) : z.t + 20;
          const pad = landing ? 0 : 30;
          const edge = (over, room) => Math.min(3, Math.max(0, over) / room) * TURN;
          fx += edge(z.l + pad - bx, 30) - edge(bx - (z.r - pad), 30);
          fy += edge(top - by, 20) - edge(by - (floor - 14), 14);
          if (!("badge" === lastSpot && landing)) {
            g.areas.forEach((a) => {
              if (inside(bx, by, a)) {
                fy -= TURN;
              }
            });
          }
          vx += fx;
          vy += fy;
          const speed = Math.hypot(vx, vy);
          if (speed > SPEED) {
            vx *= SPEED / speed;
            vy *= SPEED / speed;
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
          const gliding = energy < 0.3 && burst <= 0;
          phase += 0.055 + 0.12 * energy;
          const goal = gliding
            ? -24 + Math.sin(now / 1100) * 2.5
            : -28 + (8 + 22 * energy) * Math.sin(phase);
          wingAngle += (goal - wingAngle) * 0.18;
          const fold = 1 - 0.35 * Math.max(0, Math.sin(phase)) * energy;
          wing.style.transform = "rotate(" + wingAngle + "deg) scaleY(" + fold + ")";
          farWing.style.transform =
            "rotate(" + (wingAngle * 0.8 - 6) + "deg) scaleY(" + fold + ") translate(-4px,-2px)";
          rise = gliding ? 0 : Math.sin(phase) * 2 * energy;
          lean = Math.max(-10, Math.min(10, vy * 7));
        }
      }
      // Its tilt and the little rise and fall of its wingbeat follow softly, never snapping.
      tilt += (lean - tilt) * 0.12;
      bob += (rise - bob) * 0.2;
      bird.style.transform =
        "translate(" +
        (bx - HALF) +
        "px," +
        (by - 22 + bob) +
        "px) scaleX(" +
        dir +
        ") rotate(" +
        tilt +
        "deg)";
      if (running) {
        request = window.requestAnimationFrame(frame);
      }
    }

    // Rest while the top of the page is off screen.
    let running = false;
    let request = 0;
    const resume = () => {
      if (!running) {
        running = true;
        request = window.requestAnimationFrame(frame);
      }
    };
    const rest = () => {
      running = false;
      window.cancelAnimationFrame(request);
    };
    new IntersectionObserver((entries) => (entries[0].isIntersecting ? resume() : rest()), {
      rootMargin: "160px 0px",
    }).observe(header);

    // It arrives from the right and settles on the Book button first.
    goHome(performance.now());
    resume();
  });
})();
