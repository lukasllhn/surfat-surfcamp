/* ============================================================
   Surf At — booking flow logic (demo on sample availability)
   Vanilla JS. Availability, capacity, reservation + confirmation
   all run client-side on mock data. Payment step opens the real
   Stripe test checkout. Sample data resets on page reload.
   ============================================================ */
(function () {
  var BEDS = 8;
  var DEPOSIT = 76; // flat hold to reserve, counts toward the total
  var STRIPE = "https://buy.stripe.com/test_5kQ6oJgCTezffn1a8K3VC00";

  // sample occupancy + pricing per upcoming week
  var bookedSeed = [3, 6, 8, 2, 5, 7, 1, 4, 6];
  var priceSeed  = [303, 303, 349, 349, 349, 349, 303, 303, 303];

  // build the next 9 Saturday-to-Saturday weeks from today (browser date)
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var first = new Date(today);
  first.setDate(first.getDate() + ((6 - first.getDay() + 7) % 7 || 7)); // next Saturday
  var weeks = bookedSeed.map(function (b, i) {
    var start = new Date(first); start.setDate(start.getDate() + i * 7);
    var end = new Date(start); end.setDate(end.getDate() + 7);
    return { id: i, start: start, end: end, total: BEDS, booked: b, price: priceSeed[i] };
  });

  var state = { sel: null, guests: 1, name: "", email: "", confirmed: false, ref: "" };

  var fmt = function (d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
  var monthName = function (d) { return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }); };
  var validEmail = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var weeksEl = document.getElementById("weeks");
  var panelEl = document.getElementById("panel");

  function renderWeeks() {
    var html = "", curMonth = "";
    weeks.forEach(function (w) {
      var m = monthName(w.start);
      if (m !== curMonth) { curMonth = m; html += '<div class="month-label">' + m + "</div>"; }
      var left = w.total - w.booked;
      var full = left <= 0;
      var occ = Math.round((w.booked / w.total) * 100);
      var sel = state.sel === w.id;
      var low = !full && left <= 2;
      var capText = full ? "" : (low ? "Only " + left + " left" : left + " of " + w.total + " beds left");
      html += '<button class="week' + (sel ? " sel" : "") + (full ? " full" : "") + '" data-id="' + w.id + '"' + (full ? " disabled" : "") + ">" +
        '<div class="week__dates"><b>' + fmt(w.start) + " &rarr; " + fmt(w.end) + "</b>" +
          (full ? "" :
            '<div class="week__cap"><div class="cap-track"><div class="cap-fill" style="width:' + occ + '%"></div></div>' +
            '<span class="cap-text' + (low ? " low" : "") + '">' + capText + "</span></div>") +
        "</div>" +
        '<div class="week__price">' +
          (full ? '<span class="week__full-tag">Fully booked</span>' : "<b>&euro;" + w.price + "</b><span>7 nights</span>") +
        "</div></button>";
    });
    weeksEl.innerHTML = html;
  }

  function renderPanel() {
    if (state.confirmed) {
      var wc = weeks[state.sel];
      var totalC = wc.price * state.guests;
      panelEl.innerHTML =
        '<div class="conf">' +
          '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23" fill="none" stroke="var(--primary)" stroke-width="3"/>' +
          '<path d="M16 27l7 7 13-15" fill="none" stroke="var(--primary)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "<h3>Spot reserved</h3>" +
          '<p class="ref">Confirmation <b>' + esc(state.ref) + "</b> on its way to " + esc(state.email) + "</p>" +
          '<div class="recap">' +
            '<div class="sum-line"><span>Week</span><b>' + fmt(wc.start) + " &rarr; " + fmt(wc.end) + "</b></div>" +
            '<div class="sum-line"><span>Guests</span><b>' + state.guests + "</b></div>" +
            '<div class="sum-line"><span>Total</span><b>&euro;' + totalC + "</b></div>" +
            '<div class="sum-line"><span>Deposit due now</span><b>&euro;' + DEPOSIT + "</b></div>" +
          "</div>" +
          '<a class="btn btn--solid pay" href="' + STRIPE + '" target="_blank" rel="noopener">Pay &euro;' + DEPOSIT + " deposit to secure</a>" +
          '<div><button class="again" id="again">Book another week</button></div>' +
        "</div>";
      return;
    }
    if (state.sel === null) {
      panelEl.innerHTML = "<h2>Your booking</h2>" +
        '<p class="sum-empty">Pick a week on the left to start. You will see live availability, the price, and can reserve your bed in a few taps.</p>';
      return;
    }
    var w = weeks[state.sel];
    var left = w.total - w.booked;
    var maxG = Math.min(left, BEDS);
    var g = state.guests;
    var total = w.price * g;
    var balance = total - DEPOSIT;
    var canBook = state.name.trim() && validEmail(state.email);
    panelEl.innerHTML =
      "<h2>Your booking</h2>" +
      '<div class="sum-line"><span>Week</span><b>' + fmt(w.start) + " &rarr; " + fmt(w.end) + "</b></div>" +
      '<div class="sum-line"><span>Availability</span><b>' + left + " of " + w.total + " beds</b></div>" +
      '<div class="sum-div"></div>' +
      '<div class="sum-line"><span>Guests</span>' +
        '<span class="stepper"><button id="minus"' + (g <= 1 ? " disabled" : "") + ">&ndash;</button>" +
        '<span class="val">' + g + '</span><button id="plus"' + (g >= maxG ? " disabled" : "") + ">+</button></span></div>" +
      '<div class="sum-line"><span>&euro;' + w.price + " &times; " + g + " &middot; 7 nights</span><b>&euro;" + total + "</b></div>" +
      '<div class="sum-div"></div>' +
      '<div class="field"><label for="bn">Full name</label><input id="bn" type="text" autocomplete="name" placeholder="Jordan Rivera" value="' + esc(state.name) + '"></div>' +
      '<div class="field"><label for="be">Email</label><input id="be" type="email" autocomplete="email" placeholder="you@email.com" value="' + esc(state.email) + '"></div>' +
      '<div class="deposit"><span>Deposit to reserve</span><span class="amt">&euro;' + DEPOSIT + "</span></div>" +
      '<button class="btn btn--solid" id="confirm"' + (canBook ? "" : " disabled") + ">Confirm reservation</button>" +
      '<p class="mini-note">Balance of &euro;' + balance + " due on arrival &middot; free cancellation up to 30 days before</p>";

    var bn = document.getElementById("bn"), be = document.getElementById("be"), cf = document.getElementById("confirm");
    function refresh() { cf.disabled = !(state.name.trim() && validEmail(state.email)); }
    bn.addEventListener("input", function (e) { state.name = e.target.value; refresh(); });
    be.addEventListener("input", function (e) { state.email = e.target.value; refresh(); });
  }

  weeksEl.addEventListener("click", function (e) {
    var b = e.target.closest(".week");
    if (!b || b.classList.contains("full")) return;
    state.sel = +b.dataset.id; state.guests = 1; state.confirmed = false;
    renderWeeks(); renderPanel();
    if (window.innerWidth <= 860) panelEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  panelEl.addEventListener("click", function (e) {
    var id = e.target.id;
    if (id === "plus") { var w = weeks[state.sel]; state.guests = Math.min(state.guests + 1, w.total - w.booked, BEDS); renderPanel(); }
    else if (id === "minus") { state.guests = Math.max(1, state.guests - 1); renderPanel(); }
    else if (id === "confirm") { confirmBooking(); }
    else if (id === "again") {
      state.sel = null; state.confirmed = false; state.name = ""; state.email = ""; state.guests = 1;
      renderWeeks(); renderPanel();
      weeksEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function confirmBooking() {
    var w = weeks[state.sel];
    if (!(state.name.trim() && validEmail(state.email))) return;
    w.booked = Math.min(w.total, w.booked + state.guests); // capacity drops live
    state.ref = "SA-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    state.confirmed = true;
    renderWeeks(); renderPanel();
    panelEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  renderWeeks();
  renderPanel();
})();
