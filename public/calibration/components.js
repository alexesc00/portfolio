/* Calibration loop: component behavior
 *
 * What the components in components.css do that CSS can't. A page that uses them loads this
 * at the end of its body. Each behavior is its own function and looks for its own
 * elements, so a page without a component skips its behavior.
 */
(() => {
  // A time token from tokens.css, in milliseconds
  const tokenMs = (name, fallback) =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;

  // Runs a function once in the next frame, however many times it's asked for before then
  const onceAFrame = (run) => {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        run();
      });
    };
  };

  // Notes sheet: it loads the notes from notes.html, and the header's button opens it.
  // Close, or a click outside it, closes it.
  function setUpNotesSheet() {
    const sheet = document.getElementById("notes-sheet");
    if (!sheet) return;
    fetch("/calibration/notes.html")
      .then((response) => {
        if (!response.ok) throw new Error(`Notes didn't load: ${response.status} ${response.url}`);
        return response.text();
      })
      .then((notes) => {
        sheet.innerHTML = notes;
      });
    for (const button of document.querySelectorAll(".notes-open")) {
      button.addEventListener("click", () => sheet.showModal());
    }
    // Close arrives with the notes, so the sheet listens for it
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet || event.target.closest(".notes-sheet-close")) sheet.close();
    });
  }

  // Page chain tips. Once one tip has shown, the next shows at once, until the pointer has
  // been off the chain for a moment. Escape hides the tip that's showing, until the pointer
  // leaves its link and focus moves on. A tip that would run past the header's right edge,
  // where the header clips it, moves left.
  function setUpPageChain() {
    const tipDelay = tokenMs("--delay-tip", 200);   // the CSS hover delay
    const coolDown = 300;                            // ms off the chain before the delay returns

    for (const chain of document.querySelectorAll(".page-chain")) {
      let timer;
      chain.addEventListener("pointerover", (event) => {
        if (!event.target.closest(".page-chain-item")) return;
        clearTimeout(timer);
        timer = setTimeout(() => chain.classList.add("is-warm"), tipDelay);
      });
      chain.addEventListener("pointerleave", () => {
        clearTimeout(timer);
        timer = setTimeout(() => chain.classList.remove("is-warm"), coolDown);
      });
    }

    const keepOnScreen = (item, tip) => {
      tip.style.translate = "";
      const edge = item.closest(".site-header-in") ?? document.documentElement;
      const style = getComputedStyle(edge);
      const box = edge.getBoundingClientRect();
      const left = box.left + parseFloat(style.paddingLeft);
      const right = box.right - parseFloat(style.paddingRight);
      const tipBox = tip.getBoundingClientRect();
      const shift = Math.min(Math.max(0, tipBox.right - right), Math.max(0, tipBox.left - left));
      if (shift) tip.style.translate = `${-shift}px 0`;
    };

    const items = [...document.querySelectorAll(".page-chain-item")];
    for (const item of items) {
      const tip = item.querySelector(".page-chain-tip");
      if (!tip) continue;
      item.addEventListener("pointerenter", () => keepOnScreen(item, tip));
      item.addEventListener("focusin", () => keepOnScreen(item, tip));
      item.addEventListener("pointerleave", () => {
        if (!item.contains(document.activeElement)) item.classList.remove("is-dismissed");
      });
      item.addEventListener("focusout", (event) => {
        if (!item.contains(event.relatedTarget) && !item.matches(":hover")) {
          item.classList.remove("is-dismissed");
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      for (const item of items) {
        if (item.matches(":hover") || item.contains(document.activeElement)) {
          item.classList.add("is-dismissed");
        }
      }
    });
  }

  // Scroll boxes: while a table overflows its box, the box takes keyboard focus, so arrow
  // keys can scroll it, and the table's caption names it. Without the overflow, it's no tab
  // stop at all.
  function setUpScrollBoxes() {
    const boxes = [...document.querySelectorAll(".table-scroll")];
    if (!boxes.length) return;

    const update = (box) => {
      const caption = box.querySelector("caption");
      const scrolls =
        getComputedStyle(box).overflowX !== "visible" && box.scrollWidth > box.clientWidth;
      if (scrolls) {
        box.tabIndex = 0;
        box.setAttribute("role", "region");
        if (caption) box.setAttribute("aria-labelledby", caption.id);
      } else {
        box.removeAttribute("tabindex");
        box.removeAttribute("role");
        box.removeAttribute("aria-labelledby");
      }
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.target.closest(".table-scroll"));
    });
    boxes.forEach((box, i) => {
      const caption = box.querySelector("caption");
      if (caption && !caption.id) caption.id = `table-caption-${i + 1}`;
      observer.observe(box);
      const table = box.querySelector("table");
      if (table) observer.observe(table);
    });
  }

  // Margin notes: a marker on the frame's edge beside each annotated element. When the
  // layout puts the notes beside the view, each note sits level with its marker, pushed
  // down only when it would overlap the one above, and a leader joins the two.
  function setUpMarginNotes() {
    const frame = document.querySelector(".frame");
    const notes = document.querySelector(".notes");
    const list = notes?.querySelector("ol");
    if (!frame || !list) return;

    const NOTE_GAP = 16;      // px between notes that had to stack
    const MARKER_NUDGE = 2;   // px, to sit the marker level with the first line of text
    const RING = 2;           // px of page color around a marker on the frame
    const LINE_GAP = 6;       // px between a leader's end and its note
    const SHOULDER = 12;      // px of level line into a note that had to move down
    const SVG = "http://www.w3.org/2000/svg";

    const leaders = document.createElementNS(SVG, "svg");
    leaders.setAttribute("class", "notes-leaders");
    leaders.setAttribute("aria-hidden", "true");
    notes.append(leaders);

    const markers = new Map();
    for (const target of frame.querySelectorAll("[data-note]")) {
      const marker = document.createElement("span");
      marker.className = "marker is-on-frame t-label";
      marker.setAttribute("aria-hidden", "true");
      marker.dataset.for = target.dataset.note;
      marker.textContent = target.dataset.note;
      frame.append(marker);
      markers.set(target.dataset.note, { target, marker });
    }

    // Each pass reads the layout, then writes, so the browser lays the page out twice at
    // most, however many notes there are.
    function place() {
      const frameBox = frame.getBoundingClientRect();
      const placed = [...markers.values()].map(({ target, marker }) => ({
        marker,
        top: target.getBoundingClientRect().top - frameBox.top + MARKER_NUDGE,
      }));
      const beside = notes.getBoundingClientRect().left >= frameBox.right;
      for (const { marker, top } of placed) marker.style.top = `${top}px`;

      const items = [...list.children];
      leaders.replaceChildren();
      notes.classList.toggle("is-placed", beside);
      if (!beside) {
        for (const item of items) item.style.top = "";
        list.style.height = "";
        return;
      }

      const listTop = list.getBoundingClientRect().top;
      const box = notes.getBoundingClientRect();
      const rows = items.map((item) => ({
        item,
        height: item.offsetHeight,
        marker: markers.get(item.dataset.for)?.marker.getBoundingClientRect(),
      }));

      // A note without a marker takes the next free place, with no leader
      let floor = 0;
      for (const row of rows) {
        row.y = Math.max(row.marker ? row.marker.top - listTop : 0, floor);
        floor = row.y + row.height + NOTE_GAP;
      }
      for (const { item, y } of rows) item.style.top = `${y}px`;
      list.style.height = `${floor}px`;

      // Leaders, in the notes' own coordinates: from the marker's ring to the note's first line
      const x1 = -LINE_GAP;
      for (const { marker, y } of rows) {
        if (!marker) continue;
        const x0 = marker.right - box.left + RING;
        const y0 = Math.round(marker.top + marker.height / 2 - box.top) + 0.5;
        const y1 = Math.round(listTop + y + marker.height / 2 - box.top) + 0.5;
        const path = document.createElementNS(SVG, "path");
        path.setAttribute("d", y1 - y0 < 1
          ? `M${x0} ${y0}H${x1}`
          : `M${x0} ${y0}L${x1 - SHOULDER} ${y1}H${x1}`);
        leaders.append(path);
      }
    }

    place();
    // The frame changes size whenever its content reflows: a resize, the layout switching,
    // or the font arriving.
    const schedule = onceAFrame(place);
    new ResizeObserver(schedule).observe(frame);
    document.fonts?.ready.then(schedule);
  }

  // Full screen toggles: each gives the part its aria-controls names the whole window, and
  // takes it back. Esc takes it back too. The label says what pressing it will do.
  // The move: the part takes its new place at once, then a shift and a clip make it look as
  // it did and ease it into the new place, so nothing inside it reflows on the way.
  function setUpFullScreen() {
    const toggles = [...document.querySelectorAll(".full-screen-toggle")]
      .map((button) => ({
        button,
        label: button.querySelector(".full-screen-toggle-label"),
        part: document.getElementById(button.getAttribute("aria-controls")),
        on: false,
        move: null
      }))
      .filter((t) => t.part);
    if (!toggles.length) return;

    const still = matchMedia("(prefers-reduced-motion: reduce)");

    // A motion token, such as --motion-enter, as a duration in ms and an easing
    function motion(name) {
      const [time, ...curve] = getComputedStyle(document.documentElement)
        .getPropertyValue(name).trim().split(" ");
      return {
        duration: parseFloat(time) * (time.endsWith("ms") ? 1 : 1000),
        easing: curve.join(" ")
      };
    }

    // How the part looks in the place `from`, while it sits in the place `to`
    const lookAt = (from, to) => ({
      translate: `${from.left - to.left}px ${from.top - to.top}px`,
      clipPath: `inset(0px ${Math.max(0, to.width - from.width)}px ${Math.max(0, to.height - from.height)}px 0px)`
    });
    const inPlace = { translate: "0px 0px", clipPath: "inset(0px 0px 0px 0px)" };

    function settle(t) {
      if (!t.on) t.part.classList.remove("is-full-screen");
      t.part.classList.remove("is-moving");
      t.move?.cancel();
      t.move = null;
    }

    function set(t, on) {
      if (t.on === on) return;
      t.on = on;
      t.button.classList.toggle("is-on", on);
      t.label.textContent = on ? "Exit full screen" : "Full screen";
      // Partway: back the way it came
      if (t.move) {
        t.move.reverse();
        return;
      }

      const part = t.part;
      const shown = part.getBoundingClientRect();
      part.classList.add("is-full-screen", "is-moving");
      let frames;
      if (on) {
        frames = [lookAt(shown, part.getBoundingClientRect()), inPlace];
      } else {
        // Its place on the page, measured without leaving the window
        part.classList.remove("is-full-screen");
        const back = part.getBoundingClientRect();
        part.classList.add("is-full-screen");
        frames = [inPlace, lookAt(back, shown)];
      }
      if (still.matches) {
        settle(t);
        return;
      }
      const { duration, easing } = motion(on ? "--motion-enter" : "--motion-return");
      t.move = part.animate(frames, { duration, easing, fill: "both" });
      t.move.onfinish = () => settle(t);
    }

    for (const t of toggles) t.button.addEventListener("click", () => set(t, !t.on));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      for (const t of toggles) set(t, false);
    });
  }

  setUpNotesSheet();
  setUpPageChain();
  setUpScrollBoxes();
  setUpMarginNotes();
  setUpFullScreen();
})();
