/**
 * The logo bird as a small vector rig: the logo's head and flight wing, a resting body drawn
 * for perching, a folded wing that unfolds into the flight wing, and two-jointed legs.
 * Shapes morph between matched outlines; GSAP stages takeoff and touchdown. Without GSAP or
 * with reduced motion it simply switches pose.
 */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const NAVY = "#063e5f";
  const EDGE = "#03152f";
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const mixPoint = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
  const mixList = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const mixPoints = (a, b, t) => a.map((p, i) => mixPoint(p, b[i], t));
  const rotateAbout = ([x, y], [cx, cy], degrees) => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r),
      s = Math.sin(r);
    return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  };
  const mixColor = (a, b, t) =>
    "#" +
    [1, 3, 5]
      .map((i) => {
        const v = Math.round(mix(parseInt(a.substr(i, 2), 16), parseInt(b.substr(i, 2), 16), t));
        return v.toString(16).padStart(2, "0");
      })
      .join("");
  const element = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };
  const f = (n) => Math.round(n * 100) / 100;
  // Blend points by angle and distance about a moving pivot, turning the way the reference
  // point turns, so a wing swings open at full length instead of shrinking through the chord.
  function swing(a, b, t, pivotA, pivotB, reference) {
    const polar = (p, c) => [
      Math.hypot(p[0] - c[0], p[1] - c[1]),
      Math.atan2(p[1] - c[1], p[0] - c[0]),
    ];
    const [, ra] = polar(a[reference], pivotA),
      [, rb] = polar(b[reference], pivotB);
    let turn = rb - ra;
    turn -= 2 * Math.PI * Math.round(turn / (2 * Math.PI));
    const pivot = mixPoint(pivotA, pivotB, t);
    return a.map((p, i) => {
      const [la, aa] = polar(p, pivotA),
        [lb, ab] = polar(b[i], pivotB);
      let d = ab - aa;
      d += 2 * Math.PI * Math.round((turn - d) / (2 * Math.PI));
      const length = mix(la, lb, t),
        angle = aa + d * t;
      return [pivot[0] + length * Math.cos(angle), pivot[1] + length * Math.sin(angle)];
    });
  }

  // Absolute M/L/C/Q path data flattened to a dense polyline, then resampled by arc length.
  function flatten(d) {
    const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/g);
    const points = [];
    let i = 0,
      command = "M",
      x = 0,
      y = 0;
    const num = () => parseFloat(tokens[i++]);
    while (i < tokens.length) {
      if (/[MLCQZ]/.test(tokens[i])) command = tokens[i++];
      if (command === "M" || command === "L") {
        x = num();
        y = num();
        points.push([x, y]);
        command = "L";
      } else if (command === "C" || command === "Q") {
        const p =
          command === "C"
            ? [num(), num(), num(), num(), num(), num()]
            : [num(), num(), num(), num()];
        for (let s = 1; s <= 20; s++) {
          const t = s / 20,
            u = 1 - t;
          points.push(
            command === "C"
              ? [
                  u * u * u * x + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4],
                  u * u * u * y + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5],
                ]
              : [
                  u * u * x + 2 * u * t * p[0] + t * t * p[2],
                  u * u * y + 2 * u * t * p[1] + t * t * p[3],
                ],
          );
        }
        x = p[p.length - 2];
        y = p[p.length - 1];
      } else {
        i++;
      }
    }
    return points;
  }
  function resample(d, count) {
    const p = flatten(d);
    const lengths = [0];
    for (let i = 1; i < p.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    }
    const total = lengths[lengths.length - 1];
    const out = [];
    let j = 1;
    for (let k = 0; k < count; k++) {
      const target = (total * k) / (count - 1);
      while (j < p.length - 1 && lengths[j] < target) j++;
      const span = lengths[j] - lengths[j - 1] || 1;
      out.push(mixPoint(p[j - 1], p[j], clamp((target - lengths[j - 1]) / span)));
    }
    return out;
  }
  // Matched outlines: each piece pairs a stretch of one shape with a stretch of the other.
  function matched(pieces) {
    const a = [],
      b = [],
      starts = [];
    for (const [one, two, count] of pieces) {
      starts.push(a.length);
      a.push(...resample(one, count + 1).slice(0, -1));
      b.push(...resample(two, count + 1).slice(0, -1));
    }
    return { a, b, starts };
  }
  // A smooth curve through the points (Catmull-Rom as cubic Béziers).
  function smooth(points, closed) {
    const n = points.length;
    const at = (i) => (closed ? points[(i + n) % n] : points[clamp(i, 0, n - 1)]);
    let d = "M" + f(points[0][0]) + " " + f(points[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1),
        p1 = at(i),
        p2 = at(i + 1),
        p3 = at(i + 2);
      d +=
        " C" +
        [
          p1[0] + (p2[0] - p0[0]) / 6,
          p1[1] + (p2[1] - p0[1]) / 6,
          p2[0] - (p3[0] - p1[0]) / 6,
          p2[1] - (p3[1] - p1[1]) / 6,
          p2[0],
          p2[1],
        ]
          .map(f)
          .join(" ");
    }
    return d + (closed ? " Z" : "");
  }

  // Body outlines run from the nape to the throat, so the head always closes them.
  const BODY = {
    rest: [
      78.5, 53.9, 73.8, 57.6, 68, 62, 62, 66.5, 55, 71.5, 47, 78, 40, 84.5, 37, 87.5, 42, 93, 50,
      93.5, 56, 94.5, 63, 95, 69, 94, 76, 93, 84, 90, 89, 84, 94, 78.5, 97, 74, 98.5, 70, 99.5, 67,
      101.3, 64.7, 102.88, 62.51,
    ],
    flight: [
      83.5, 49.9, 78, 54, 65, 62, 56.82, 73.56, 53, 77, 47, 82.5, 43.8, 85.52, 43, 90, 46, 95,
      51.75, 96.52, 58, 94.6, 69, 93.5, 75.47, 91.7, 84.97, 89.26, 94.37, 83.33, 98.23, 77.34,
      99.14, 75.94, 102.5, 69.4, 102.5, 69.05, 102.5, 68.55, 106.98, 59.77, 107.88, 58.51,
    ],
  };
  const NAPE = [83.5, 49.9],
    THROAT = [107.88, 58.51];
  const HEAD =
    "M107.88 58.51 C 110.23 55.21 113.84 52.73 119.07 50.8 C 121.62 49.86 121.78 49.79 122.14 49.44 C 122.86 48.74 122.49 48.3 121.01 48.1 C 120.54 48.04 119.54 47.88 118.8 47.74 C 118.06 47.61 116.91 47.45 116.25 47.39 C 113.91 47.19 110.41 46.07 107.48 44.59 C 103.59 42.63 103.06 42.5 99.07 42.5 C 93.49 42.51 89.94 44.2 83.5 49.9";
  // Where the head sits on the resting body, relative to the logo.
  const HEAD_REST = [-5, 4];
  const NECK = [93, 64];

  // Tail: resting it hangs below the perch; in flight it trails as in the logo.
  const TAIL = matched([
    ["M42 85 C33 91.5 24 98 16 104.5", "M58 83 C46 89 31 95 20 98.6", 10],
    ["M16 104.5 C16.8 106 18 107.4 19.5 108.5", "M20 98.6 C19.6 100 21 100.8 23 101", 3],
    ["M19.5 108.5 C30 103 41 97.5 52 92", "M23 101 C36 101 50 97.5 62 93", 10],
    ["M52 92 C49 89.5 45.5 87 42 85", "M62 93 C61 89 60 86 58 83", 3],
  ]);

  // Flight wing (the logo's) and folded wing, piece by piece. The arm is the inner wing with
  // its coverts, the hand the long flight feathers. Each piece: [folded, open, samples].
  const ARM = matched([
    [
      "M77 55.2 C72.5 58.5 66 63.5 51 75",
      "M78.43 51.79 C 77.07 49.28 74.93 46.19 73.19 44.25 C 66.79 37.06 63.45 34.54 55.4 30.82 C 51.62 29.08 51.06 28.83 49.45 28.2 C 48.57 27.85 47.02 27.23 46 26.82 C 44.98 26.42 43.48 25.81 42.65 25.49",
      16,
    ],
    ["M51 75 C52.3 78.7 53.7 82.3 55 86", "M42.65 25.49 Q37 37 33.82 52.27", 8],
    [
      "M55 86 C60 84.3 64 82.6 68 81 C73 79 78 76.5 82 73.5",
      "M33.82 52.27 C 35.83 55.42 37.4 57.22 40.52 59.96 C 41.2 60.55 42.22 61.47 42.8 62 C 43.7 62.83 45.53 64.36 47.1 65.6 C 47.67 66.06 50.08 67.78 51.25 68.58 C 51.75 68.92 52.78 69.67 53.55 70.26 C58 73 66 74 72 68",
      16,
    ],
    ["M82 73.5 C85 69.5 82 59 77 55.2", "M72 68 Q78 63 78.43 51.79", 8],
  ]);
  const HAND = matched([
    [
      "M51 75 C43 81 34 88.5 23 97.5",
      "M42.65 25.49 C 40.07 24.42 38.96 23.97 38 23.6 C 37.04 23.23 35.9 22.76 35.47 22.56 C 35.05 22.37 33.86 21.86 32.82 21.44 C 31.79 21.03 30.05 20.24 28.95 19.7 C 27.85 19.16 26.46 18.51 25.85 18.25 C 25.25 17.99 24.21 17.5 23.55 17.17 C 22.89 16.84 21.7 16.27 20.9 15.9 C 20.1 15.53 18.96 14.95 18.35 14.61 C 17.75 14.28 16.5 13.62 15.59 13.16 C 12.66 11.67 11.35 10.83 7.72 8.12 C 3.32 4.84 2.6 4.66 2.6 6.83",
      24,
    ],
    [
      "M23 97.5 C25 98 28.5 96.6 32 95 C40 91.4 48 88.3 55 86",
      "M2.6 6.83 C 2.6 8.82 4.79 14.43 6.71 17.38 C 7.29 18.27 7.4 18.61 7.38 19.61 C 7.37 20.53 7.34 20.46 8.79 22.4 C 10.09 24.14 11.85 26.01 13.34 27.23 C 16.49 29.81 18.02 31.14 18.87 32.02 C 20.3 33.49 20.24 34 18.6 34.3 C 16.62 34.66 16.84 35.6 19.54 38.38 C 21.21 40.1 23.89 42.08 26.4 43.45 C 26.98 43.77 27.97 44.4 28.6 44.85 C 29.23 45.3 30.27 46 30.9 46.4 C 33.18 47.84 33.37 48.14 32.89 49.39 C 32.59 50.2 32.67 50.46 33.82 52.27",
      40,
    ],
    ["M55 86 C53.7 82.3 52.3 78.7 51 75", "M33.82 52.27 Q44 40 42.65 25.49", 8],
  ]);
  // Joints, folded and open: the shoulder the wing turns on, and the wrist the hand turns on.
  const SHOULDER = { folded: [76, 63], open: [78, 57] };
  const WRIST = { folded: [53.5, 81], open: [40, 39] };
  // One colour per wing. The far wing lightens as it opens behind the body, a little like the old
  // bird's pale far wing, which made the wingbeat livelier (Basil, 2026-10-18); it stays opaque.
  const COLORS = { near: [NAVY, NAVY], far: [NAVY, "#7593a6"] };

  // Legs: hip to heel to foot, solved for a backward heel; toes splay, grip or curl.
  const HIP = { rest: [70, 89.5], flight: [72, 88] };
  const SHIN = 6.4,
    SHANK = 7;
  const FOOT_REST = [71.5, 100];
  function leg(hip, foot) {
    const dx = foot[0] - hip[0],
      dy = foot[1] - hip[1];
    const reach = Math.min(Math.hypot(dx, dy), SHIN + SHANK - 0.01);
    const along = (SHIN * SHIN - SHANK * SHANK + reach * reach) / (2 * reach);
    const out = Math.sqrt(Math.max(0, SHIN * SHIN - along * along));
    const ux = dx / (Math.hypot(dx, dy) || 1),
      uy = dy / (Math.hypot(dx, dy) || 1);
    // The heel bends backward, away from the beak.
    const heel = [hip[0] + ux * along + uy * out, hip[1] + uy * along - ux * out];
    if (heel[0] > hip[0] + ux * along) {
      heel[0] = hip[0] + ux * along - uy * out;
      heel[1] = hip[1] + uy * along + ux * out;
    }
    const end = [hip[0] + ux * reach, hip[1] + uy * reach];
    return { heel, foot: end };
  }

  window.BluebirdRig = function (host, { reduced = false } = {}) {
    const svg = element("svg", {
      viewBox: "0 0 126 104",
      fill: NAVY,
      "aria-hidden": "true",
      focusable: "false",
      class: "bb-bird__art",
    });
    const pose = element("g", { class: "bb-bird__pose" });
    const edge = (extra = {}) =>
      element("path", {
        fill: "none",
        stroke: EDGE,
        "stroke-width": 0.8,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        ...extra,
      });
    // The pale far wing has no outline, as the old bird's had none (Basil, 2026-10-18).
    function wing(name, outlined = true) {
      const shoulder = element("g", { class: name });
      const wrist = element("g");
      const hand = element("path");
      const handEdge = edge();
      const joint = element("path");
      const arm = element("path");
      const armEdge = edge();
      const front = edge();
      if (!outlined) {
        [handEdge, armEdge, front].forEach((line) => line.setAttribute("stroke", "none"));
      }
      wrist.append(hand, handEdge);
      shoulder.append(wrist, joint, arm, armEdge, front);
      return { shoulder, wrist, hand, handEdge, joint, arm, armEdge, front };
    }
    const far = wing("bb-bird__rear-wing", false);
    const near = wing("bb-bird__near-wing");
    const tail = element("path", {
      class: "bb-bird__tail",
      stroke: EDGE,
      "stroke-width": 0.8,
      "stroke-linejoin": "round",
    });
    const legStyle = {
      fill: "none",
      "stroke-width": 1.4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    };
    const farLeg = element("path", { class: "bb-bird__leg", stroke: "#0d2a40", ...legStyle });
    const nearLeg = element("path", { class: "bb-bird__leg", stroke: EDGE, ...legStyle });
    const torso = element("g", { class: "bb-bird__torso" });
    const body = element("path", { class: "bb-bird__torso-fill" });
    const bodyEdge = edge({ class: "bb-bird__torso-edge" });
    torso.append(body, bodyEdge);
    const head = element("g", { class: "bb-bird__head" });
    head.append(
      element("path", { d: HEAD + " L90 58 L104 61.5 Z" }),
      edge({ d: HEAD }),
      element("ellipse", {
        cx: 101.61,
        cy: 51.13,
        rx: 2.37,
        ry: 0.88,
        transform: "rotate(-50.9 101.61 51.13)",
        fill: "#a2b0b3",
      }),
    );
    pose.append(far.shoulder, farLeg, nearLeg, tail, torso, near.shoulder, head);
    svg.append(pose);
    host.appendChild(svg);

    // open: wing unfolded; posture: flight body; legs: 0 tucked, 1 standing; reach: legs
    // forward to grab a perch; pitch: whole-bird tilt; dip: body sinking onto bent legs.
    let crouched = false;
    const state = { open: 0, posture: 0, legs: 1, reach: 0, pitch: 0, dip: 0, brake: 0 };
    let flight = false,
      tween,
      stroke = 0,
      effort = 1,
      glide = false,
      approach = 0,
      glideBlend = 0,
      headAngle = 0,
      sway = 0,
      swayVelocity = 0,
      weight = 0,
      previousTime = 0;

    function drawWing(part, flap, wristAngle, lag, colors) {
      const open = state.open;
      const tip = HAND.starts[1];
      const arm = swing(ARM.a, ARM.b, open, SHOULDER.folded, SHOULDER.open, ARM.starts[1]);
      const hand = swing(HAND.a, HAND.b, open, SHOULDER.folded, SHOULDER.open, tip);
      // The folded wing rides on the resting body, the open wing on the flight body.
      const shift = [
        (SHOULDER.open[0] - SHOULDER.folded[0]) * (posture() - open),
        (SHOULDER.open[1] - SHOULDER.folded[1]) * (posture() - open),
      ];
      const pivot = mixPoint(SHOULDER.folded, SHOULDER.open, open);
      part.shoulder.setAttribute(
        "transform",
        "translate(" +
          f(shift[0]) +
          " " +
          f(shift[1] + state.dip) +
          ") rotate(" +
          f((flap + lag) * open * open * open) +
          " " +
          f(pivot[0]) +
          " " +
          f(pivot[1]) +
          ")",
      );
      const wrist = swing([WRIST.folded], [WRIST.open], open, SHOULDER.folded, SHOULDER.open, 0)[0];
      const bend = wristAngle * open;
      part.wrist.setAttribute(
        "transform",
        "rotate(" + f(bend) + " " + f(wrist[0]) + " " + f(wrist[1]) + ")",
      );
      part.hand.setAttribute("d", smooth(hand, true));
      // Outline the hand's leading and trailing edges, not the seam it shares with the arm.
      part.handEdge.setAttribute("d", smooth(hand.slice(0, HAND.starts[2] + 1), false));
      part.arm.setAttribute("d", smooth(arm, true));
      const s = ARM.starts;
      part.armEdge.setAttribute(
        "d",
        smooth(arm.slice(s[0], s[1] + 1), false) + " " + smooth(arm.slice(s[2], s[3] + 1), false),
      );
      part.front.setAttribute("d", smooth(arm.slice(s[3]).concat([arm[0]]), false));
      part.front.setAttribute("opacity", f(1 - clamp(open * 3)));
      // Fill the notch a turned hand would leave at the wrist.
      const lead = arm[s[1]],
        trail = arm[s[2]];
      part.joint.setAttribute(
        "d",
        "M" +
          [lead, rotateAbout(lead, wrist, bend), rotateAbout(trail, wrist, bend), trail]
            .map((p) => f(p[0]) + " " + f(p[1]))
            .join(" L") +
          " Z",
      );
      const fill = mixColor(colors[0], colors[1], clamp(open * 1.6));
      [part.arm, part.joint, part.hand].forEach((el) => el.setAttribute("fill", fill));
    }

    // Coming in to land, the body already takes most of its perched shape while the wings brake.
    const posture = () => Math.min(state.posture, 1 - 0.65 * approach);
    function render() {
      const rest = 1 - posture();
      const reach = Math.max(state.reach, approach);
      const legs = Math.max(state.legs, approach);
      // Head and neck: the head turns on the neck, and the body outline follows it.
      const offset = [HEAD_REST[0] * rest, HEAD_REST[1] * rest + state.dip];
      const turn = headAngle * rest;
      const neck = [NECK[0] + offset[0], NECK[1] + offset[1]];
      const place = (p) => rotateAbout([p[0] + offset[0], p[1] + offset[1]], neck, turn);
      head.setAttribute(
        "transform",
        "rotate(" +
          f(turn) +
          " " +
          f(neck[0]) +
          " " +
          f(neck[1]) +
          ") translate(" +
          f(offset[0]) +
          " " +
          f(offset[1]) +
          ")",
      );
      const points = mixList(BODY.rest, BODY.flight, posture());
      for (let i = 2; i < points.length - 2; i++) points[i] += i % 2 ? state.dip * 0.85 : 0;
      // The ends join the head; the handles next to them turn with it, so the neck stays smooth.
      const n = points.length;
      points.splice(2, 2, ...rotateAbout(points.slice(2, 4), neck, turn));
      points.splice(n - 4, 2, ...rotateAbout(points.slice(n - 4, n - 2), neck, turn));
      points.splice(0, 2, ...place(NAPE));
      points.splice(n - 2, 2, ...place(THROAT));
      const outline =
        "M" + points.slice(0, 2).map(f).join(" ") + " C" + points.slice(2).map(f).join(" ");
      body.setAttribute("d", outline + " Z");
      bodyEdge.setAttribute("d", outline);
      // Whole-bird tilt about the feet, so a perched bird leans without sliding.
      const tilt = state.pitch - 8 * approach + (weight + headAngle * 0.15) * rest;
      pose.setAttribute("transform", "rotate(" + f(tilt) + " " + FOOT_REST.join(" ") + ")");
      // Tail: hangs and balances when perched, trails and fans down a little when braking.
      const tailPoints = mixPoints(TAIL.a, TAIL.b, posture());
      tail.setAttribute("d", smooth(tailPoints, true));
      const base = mixPoint([50, 89], [60, 88], posture());
      tail.setAttribute(
        "transform",
        "translate(0 " +
          f(state.dip * 0.7) +
          ") rotate(" +
          f(sway - 10 * approach) +
          " " +
          f(base[0]) +
          " " +
          f(base[1]) +
          ")",
      );
      // Legs: standing they keep the perch; tucked they fold up under the belly.
      const hip = mixPoint(HIP.rest, HIP.flight, posture());
      hip[1] += state.dip;
      const stand = mixPoint(FOOT_REST, [hip[0] + 6, hip[1] + 11], reach);
      const tucked = [hip[0] - 3.5, hip[1] + 2.5];
      const foot = mixPoint(tucked, stand, legs);
      const toe = mix(160, mix(90, 55, reach), legs);
      const back = mix(150, mix(-90, -55, reach), legs);
      const toeLength = mix(1.6, 3.4, legs);
      for (const [path, dx] of [
        [farLeg, 2.4],
        [nearLeg, 0],
      ]) {
        const h = [hip[0] + dx, hip[1] - dx * 0.2];
        const ft = [foot[0] + dx * legs, foot[1]];
        const { heel, foot: end } = leg(h, ft);
        const front = rotateAbout([end[0], end[1] + toeLength], end, -toe);
        const front2 = rotateAbout([end[0], end[1] + toeLength * 0.8], end, -toe - 18 * legs);
        const hind = rotateAbout([end[0], end[1] + toeLength * 0.75], end, -back);
        const p = (q) => f(q[0]) + " " + f(q[1]);
        path.setAttribute(
          "d",
          "M" +
            p(h) +
            " L" +
            p(heel) +
            " L" +
            p(end) +
            " L" +
            p(front) +
            " M" +
            p(end) +
            " L" +
            p(front2) +
            " M" +
            p(end) +
            " L" +
            p(hind),
        );
      }
      // Wings: the two rigid sections unfold once; during flight their lengths never change.
      // Gliding, the wings stay spread about level; they ease into and out of it.
      const beat = mix(clamp(0.5 + stroke * 0.5 * effort), 0.42, glideBlend);
      const cruise = 12 - 110 * beat;
      // Braking for a perch: slower, shallower strokes held forward.
      const braking = mix(cruise, 25 - 35 * beat, Math.max(approach, state.brake));
      const flap = flight || state.brake ? braking : state.brake;
      const wristAngle = flight ? -6 + 12 * beat : -4;
      drawWing(far, flap, wristAngle, -12, COLORS.far);
      drawWing(near, flap, wristAngle, 0, COLORS.near);
      svg.dataset.pose =
        state.open < 0.001 && posture() < 0.001
          ? "perched"
          : state.open > 0.999 && posture() > 0.999
            ? "flying"
            : "transition";
    }

    function update({
      flying = false,
      beat = 0,
      power = 1,
      gliding = false,
      landing = 0,
      crouch = 0,
      headTilt = 0,
      balance = 0,
      time = performance.now(),
    } = {}) {
      stroke = Math.max(-1, Math.min(1, beat));
      effort = Math.max(0.3, Math.min(1, power));
      glide = gliding;
      const dt = previousTime ? Math.min(0.05, Math.max(0, (time - previousTime) / 1000)) : 1 / 60;
      previousTime = time;
      headAngle += (reduced ? 0 : headTilt - headAngle) * (1 - Math.exp(-12 * dt));
      // Approaching a perch, it brakes, pitches up and reaches with its feet.
      const wanted = !reduced && flying ? clamp(landing) : 0;
      approach += (wanted - approach) * (1 - Math.exp(-10 * dt));
      glideBlend += ((glide && approach < 0.05 ? 1 : 0) - glideBlend) * (1 - Math.exp(-14 * dt));
      // Small independent weight shifts, with a damped tail response for balance.
      weight = reduced
        ? 0
        : Math.pow(Math.max(0, Math.sin(time / 2700) * Math.sin(time / 5100)), 4) * 0.9;
      const target = reduced
        ? 0
        : -(weight + headAngle * 0.15) * 0.7 - Math.max(-8, Math.min(8, balance)) * 0.22;
      swayVelocity += (target - sway) * 28 * dt;
      swayVelocity *= Math.exp(-8 * dt);
      sway += swayVelocity * dt;
      const next = !reduced && flying;
      if (next !== flight) {
        flight = next;
        if (tween) tween.kill();
        if (window.gsap && !reduced) {
          tween = window.gsap.timeline({ onUpdate: render });
          if (flight) {
            // A push off the feet, wings out on the first stroke, legs folded once airborne.
            state.brake = 0;
            tween
              .to(state, { pitch: -6, duration: 0.1, ease: "sine.out" }, 0)
              .to(state, { pitch: 0, duration: 0.3, ease: "sine.inOut" }, 0.1)
              .to(state, { open: 1, duration: 0.26, ease: "power2.out" }, 0)
              .to(state, { posture: 1, duration: 0.34, ease: "sine.inOut" }, 0.02)
              .to(state, { legs: 0, duration: 0.24, ease: "sine.in" }, 0.1)
              .to(state, { reach: 0, dip: 0, duration: 0.1 }, 0);
          } else {
            // Touchdown: the reaching legs take the weight and bend, the body tips forward and
            // back, and only then do the wings fold away.
            state.reach = Math.max(state.reach, approach);
            state.legs = Math.max(state.legs, approach);
            state.posture = posture();
            state.pitch -= 8 * approach;
            state.brake = Math.max(state.brake, approach);
            approach = 0;
            swayVelocity += 40;
            tween
              .to(state, { legs: 1, duration: 0.12, ease: "power2.out" }, 0)
              .to(state, { reach: 0, duration: 0.2, ease: "power2.out" }, 0)
              .to(state, { dip: 1.6, duration: 0.14, ease: "power2.out" }, 0.04)
              .to(state, { dip: 0, duration: 0.42, ease: "sine.inOut" }, 0.18)
              .to(state, { pitch: 7, duration: 0.18, ease: "sine.out" }, 0)
              .to(state, { pitch: 0, duration: 0.55, ease: "back.out(2)" }, 0.18)
              .to(state, { brake: 1, duration: 0.1 }, 0)
              .to(state, { open: 0, duration: 0.34, ease: "sine.inOut" }, 0.12)
              .to(state, { brake: 0, duration: 0.2 }, 0.3)
              .to(state, { posture: 0, duration: 0.4, ease: "sine.inOut" }, 0.06);
          }
        } else {
          Object.assign(state, {
            open: flight ? 1 : 0,
            posture: flight ? 1 : 0,
            legs: flight ? 0 : 1,
            reach: 0,
            pitch: 0,
            dip: 0,
            brake: 0,
          });
        }
      }
      // A crouch before a hop: the body sinks onto bent legs while the feet stay put.
      if (!flight && !reduced && (crouch > 0 || crouched) && !(tween && tween.isActive())) {
        state.dip = crouch * 1.4;
        crouched = crouch > 0;
      }
      render();
    }
    render();
    return {
      update,
      element: svg,
      // For pose studies: freeze any combination of the staged values.
      set(values) {
        if (tween) tween.kill();
        Object.assign(state, values);
        if ("approach" in values) approach = values.approach;
        if ("beat" in values) stroke = values.beat;
        if ("flying" in values) flight = values.flying;
        if ("glance" in values) headAngle = values.glance;
        render();
      },
      destroy: () => {
        if (tween) tween.kill();
        svg.remove();
      },
    };
  };
})();
