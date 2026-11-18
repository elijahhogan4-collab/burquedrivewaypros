(function () {
  var box = document.querySelector("[data-filters]");
  if (!box) return;
  var q = box.querySelector("[data-q]");
  var area = box.querySelector("[data-area]");
  var flags = Array.prototype.slice.call(box.querySelectorAll("[data-flag]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-grid] .card"));
  var count = document.querySelector("[data-count]");
  var empty = document.querySelector("[data-empty]");

  var params = new URLSearchParams(location.search);
  if (params.get("q") && q) q.value = params.get("q");

  function run() {
    var term = (q && q.value || "").trim().toLowerCase();
    var a = area ? area.value : "";
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!term || c.dataset.text.indexOf(term) !== -1) && (!a || c.dataset.area === a);
      flags.forEach(function (f) { if (f.checked && c.dataset[f.dataset.flag] !== "yes") ok = false; });
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (count) count.textContent = shown + (shown === 1 ? " pro" : " pros");
    if (empty) empty.hidden = shown !== 0;
  }
  [q, area].concat(flags).forEach(function (el) { if (el) el.addEventListener("input", run); });
  run();
})();
