/* SurvAI App Guard
   Mencegah seleksi teks, long-press callout, context menu, dan copy/cut
   di seluruh aplikasi (mode aplikasi privat). Input/textarea/contenteditable
   tetap bisa diketik & diseleksi agar form berfungsi normal. */
(function () {
  'use strict';

  // 1) CSS global: matikan user-select & touch-callout, kecuali field input
  var css =
    '*,*::before,*::after{' +
      '-webkit-user-select:none!important;' +
      '-moz-user-select:none!important;' +
      '-ms-user-select:none!important;' +
      'user-select:none!important;' +
      '-webkit-touch-callout:none!important;' +
      '-webkit-tap-highlight-color:transparent}' +
    'input,textarea,select,[contenteditable=""],[contenteditable="true"]{' +
      '-webkit-user-select:text!important;' +
      '-moz-user-select:text!important;' +
      '-ms-user-select:text!important;' +
      'user-select:text!important;' +
      '-webkit-touch-callout:default!important}';

  function injectStyle() {
    var s = document.createElement('style');
    s.id = 'app-guard-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  injectStyle();
  // Pastikan style tetap paling akhir di <head> (menang melawan style lain)
  document.addEventListener('DOMContentLoaded', function () {
    var s = document.getElementById('app-guard-style');
    if (s && document.head && document.head.lastElementChild !== s) {
      document.head.appendChild(s);
    }
  });

  // 2) Helper: elemen yang boleh diseleksi (field isian)
  function isEditable(el) {
    while (el && el.nodeType === 1) {
      var tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      el = el.parentElement;
    }
    return false;
  }

  // 3) Blokir context menu / long-press menu (Terjemahkan, Salin, Bagikan)
  document.addEventListener('contextmenu', function (e) {
    if (!isEditable(e.target)) e.preventDefault();
  }, { capture: true });

  // 4) Blokir mulainya seleksi teks di luar field isian
  document.addEventListener('selectstart', function (e) {
    if (!isEditable(e.target)) e.preventDefault();
  }, { capture: true });

  // 5) Blokir copy/cut di luar field isian
  ['copy', 'cut'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (!isEditable(e.target)) {
        e.preventDefault();
        if (e.clipboardData) e.clipboardData.setData('text/plain', '');
      }
    }, { capture: true });
  });

  // 6) Jaring pengaman: jika seleksi tetap lolos (mis. gesture browser),
  //    hapus seleksinya agar sheet pencarian Google tidak muncul.
  document.addEventListener('selectionchange', function () {
    var sel = document.getSelection();
    if (!sel || sel.isCollapsed) return;
    var node = sel.anchorNode;
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!isEditable(el)) sel.removeAllRanges();
  });
})();
