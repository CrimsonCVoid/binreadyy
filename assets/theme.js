/*
 * Ready Eddie — Shopify Theme JS
 * No dependencies. Vanilla JS.
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Header shrink on scroll ─── */
  var header = document.querySelector('.site-header');
  if (header) {
    function onScroll() {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── Mobile hamburger nav ─── */
  var navToggle = document.querySelector('.nav-toggle');
  var primaryNav = document.getElementById('primary-nav');
  if (navToggle && primaryNav) {
    function setNavOpen(open) {
      primaryNav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    navToggle.addEventListener('click', function () {
      setNavOpen(!primaryNav.classList.contains('is-open'));
    });
    primaryNav.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a');
      if (a && primaryNav.classList.contains('is-open')) setNavOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && primaryNav.classList.contains('is-open')) setNavOpen(false);
    });
  }

  /* ─── Smooth tweened scroll for hash links (nav + in-page anchors) ─── */
  function headerOffset() {
    return header ? header.getBoundingClientRect().height + 8 : 88;
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function tweenScrollTo(targetY, duration) {
    var startY = window.pageYOffset || document.documentElement.scrollTop;
    var delta = targetY - startY;
    if (Math.abs(delta) < 2) { window.scrollTo(0, targetY); return; }
    var start = performance.now();
    var cancelled = false;
    function cancel() { cancelled = true; cleanup(); }
    function cleanup() {
      window.removeEventListener('wheel', cancel, { passive: true });
      window.removeEventListener('touchstart', cancel, { passive: true });
      window.removeEventListener('keydown', cancel);
    }
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    function tick(now) {
      if (cancelled) return;
      var t = Math.min((now - start) / duration, 1);
      window.scrollTo(0, startY + delta * easeInOutCubic(t));
      if (t < 1) requestAnimationFrame(tick);
      else cleanup();
    }
    requestAnimationFrame(tick);
  }
  function resolveHashTarget(href) {
    if (!href) return null;
    var hashIdx = href.indexOf('#');
    if (hashIdx === -1) return null;
    var hash = href.slice(hashIdx + 1);
    if (!hash) return null;
    var pathOnly = href.slice(0, hashIdx);
    if (pathOnly && pathOnly !== location.pathname && pathOnly !== location.pathname + location.search) {
      try {
        var url = new URL(href, location.href);
        if (url.pathname !== location.pathname) return null;
      } catch (e) { return null; }
    }
    try { return document.getElementById(hash) || document.querySelector('#' + CSS.escape(hash)); }
    catch (e) { return document.getElementById(hash); }
  }
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var target = resolveHashTarget(a.getAttribute('href'));
    if (!target) return;
    ev.preventDefault();
    var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    y = Math.max(0, Math.min(y, maxY));
    if (prefersReduced) { window.scrollTo(0, y); }
    else { tweenScrollTo(y, 700); }
    if (history.replaceState) history.replaceState(null, '', '#' + target.id);
    if (target.tabIndex < 0) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* Honor initial hash on page load with header offset */
  if (location.hash && location.hash.length > 1) {
    window.addEventListener('load', function () {
      var target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
      window.scrollTo(0, Math.max(0, y));
    });
  }

  /* ─── Reveal-on-scroll ─── */
  if (!prefersReduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ─── Shopify AJAX Add-to-Cart ─── */
  document.querySelectorAll('.js-add-to-cart').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Adding&hellip;';

      var variantInput = form.querySelector('input[name="id"]:checked')
        || form.querySelector('input[name="id"]:not([type="radio"])')
        || form.querySelector('input[name="id"]');
      if (!variantInput || !variantInput.value) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
      }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          items: [{ id: parseInt(variantInput.value, 10), quantity: 1 }]
        })
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var msg = (data && (data.description || data.message)) || 'Cart error';
            throw new Error(msg);
          }
          return data;
        });
      })
      .then(function () {
        btn.innerHTML = 'Added &#10003;';
        setTimeout(function () {
          window.location.href = '/cart';
        }, 600);
      })
      .catch(function (err) {
        btn.innerHTML = 'Error — try again';
        btn.disabled = false;
        if (window.console && console.warn) console.warn('Add to cart failed:', err);
        setTimeout(function () { btn.innerHTML = originalText; }, 2200);
      });
    });
  });

  /* ─── Pack picker: live update price, visual selection state ─── */
  document.querySelectorAll('.pack-picker').forEach(function (picker) {
    var form = picker.closest('form');
    function syncSelection() {
      var checked = picker.querySelector('input[type="radio"]:checked');
      if (!checked) return;
      picker.querySelectorAll('.pack-option').forEach(function (opt) {
        var input = opt.querySelector('input[type="radio"]');
        opt.classList.toggle('is-checked', !!input && input === checked);
      });
      var priceEl = form && form.querySelector('.buy-price');
      if (priceEl && checked.dataset.price) priceEl.textContent = checked.dataset.price;
    }
    picker.addEventListener('change', syncSelection);
    syncSelection();
  });

  /* ─── Mobile sticky shop bar ─── */
  (function () {
    var bar = document.querySelector('[data-mobile-shop-bar]');
    if (!bar) return;
    /* Match the CSS breakpoint — only behave on phone widths. */
    var mq = window.matchMedia('(max-width: 720px)');

    /* Hide only when an actual purchase CTA (final-buy picker or hero
       buy panel) is in view — otherwise keep the bar visible from
       initial load so price + CTA are always one tap away. */
    var ctas = document.querySelectorAll('.final-buy, .buy-panel');
    var ctaInView = 0;

    function update() {
      if (!mq.matches) {
        bar.hidden = true;
        bar.classList.remove('is-visible');
        return;
      }
      bar.hidden = false;
      bar.classList.toggle('is-visible', ctaInView === 0);
    }

    if ('IntersectionObserver' in window && ctas.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          ctaInView += entry.isIntersecting ? 1 : -1;
        });
        if (ctaInView < 0) ctaInView = 0;
        update();
      }, { threshold: 0.2 });
      ctas.forEach(function (el) { io.observe(el); });
    }

    mq.addEventListener('change', update);
    update();
  })();

  /* ─── Contact form: inline submit, no page reload ─── */
  document.querySelectorAll('.js-contact-form').forEach(function (form) {
    var shell = form.closest('[data-contact-shell]') || form.parentElement;
    var status = shell && shell.querySelector('[data-contact-status]');
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    var successMessage = (shell && shell.getAttribute('data-success-message'))
      || 'Thanks! We got your message.';

    function showStatus(text, isError) {
      if (!status) return;
      status.textContent = text;
      status.className = 'contact-status is-shown' + (isError ? ' is-error' : '');
      status.setAttribute('role', isError ? 'alert' : 'status');
      status.hidden = false;
    }
    function clearStatus() {
      if (!status) return;
      status.textContent = '';
      status.className = 'contact-status';
      status.hidden = true;
    }
    function clearFallbacks() {
      if (!shell) return;
      shell.querySelectorAll('[data-contact-fallback]').forEach(function (el) {
        el.remove();
      });
    }

    form.addEventListener('submit', function (ev) {
      if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        return; /* let the browser show its native validation UI */
      }
      ev.preventDefault();
      clearFallbacks();
      clearStatus();

      var originalLabel = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Sending&hellip;';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'text/html' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          /* Shopify redirects to ?contact_posted=true on success.
             If the final URL says false, parse out the validation errors. */
          var url = res.url || '';
          if (url.indexOf('contact_posted=true') !== -1) {
            return { ok: true };
          }
          return res.text().then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var err = doc.querySelector('[data-contact-fallback].is-error, .errors');
            return {
              ok: false,
              message: err ? err.textContent.trim() : 'Could not send — please try again.'
            };
          });
        })
        .then(function (result) {
          if (result.ok) {
            showStatus(successMessage, false);
            shell && shell.classList.add('is-sent');
            form.reset();
          } else {
            showStatus(result.message, true);
          }
        })
        .catch(function () {
          showStatus(
            "Couldn't send right now. Try again in a moment, or email us directly.",
            true
          );
        })
        .then(function () {
          btn.disabled = false;
          btn.innerHTML = originalLabel;
        });
    });
  });

  /* ─── Cart page: qty controls, remove, AJAX update ─── */
  initCartPage();

  function initCartPage() {
    var cartRoot = document.querySelector('[data-cart-root]');
    if (!cartRoot) return;

    function fmtMoney(cents) {
      var sign = cents < 0 ? '-' : '';
      var n = Math.abs(cents) / 100;
      return sign + '$' + n.toFixed(2);
    }

    function setBusy(busy) {
      cartRoot.classList.toggle('is-busy', !!busy);
    }

    function showError(msg) {
      var el = cartRoot.querySelector('[data-cart-error]');
      if (!el) return;
      el.textContent = msg || '';
      el.hidden = !msg;
    }

    function updateLine(line, quantity) {
      setBusy(true);
      showError('');
      return fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line: line, quantity: quantity })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error((data && (data.description || data.message)) || 'Could not update cart');
            return data;
          });
        })
        .then(function (cart) {
          renderCart(cart);
        })
        .catch(function (err) {
          showError(err.message || 'Could not update cart');
        })
        .then(function () { setBusy(false); });
    }

    function renderCart(cart) {
      if (cart.item_count === 0) {
        window.location.reload();
        return;
      }
      cartRoot.querySelectorAll('[data-line-row]').forEach(function (row) {
        var key = row.getAttribute('data-line-key');
        var match = (cart.items || []).find(function (it) { return it.key === key; });
        if (!match) {
          row.remove();
          return;
        }
        var qty = row.querySelector('[data-line-qty-value]');
        var lineTotal = row.querySelector('[data-line-total]');
        if (qty) qty.textContent = match.quantity;
        if (lineTotal) lineTotal.textContent = fmtMoney(match.final_line_price);
        row.querySelectorAll('[data-line-qty-input]').forEach(function (input) { input.value = match.quantity; });
      });
      var subtotal = cartRoot.querySelector('[data-cart-subtotal]');
      if (subtotal) subtotal.textContent = fmtMoney(cart.items_subtotal_price);
      var count = cartRoot.querySelector('[data-cart-count]');
      if (count) count.textContent = cart.item_count + (cart.item_count === 1 ? ' item' : ' items');
    }

    cartRoot.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-line-action]');
      if (!btn) return;
      ev.preventDefault();
      var row = btn.closest('[data-line-row]');
      if (!row) return;
      var line = parseInt(row.getAttribute('data-line-index'), 10);
      var current = parseInt(row.querySelector('[data-line-qty-value]').textContent, 10) || 0;
      var action = btn.getAttribute('data-line-action');
      if (action === 'inc') updateLine(line, current + 1);
      else if (action === 'dec') updateLine(line, Math.max(0, current - 1));
      else if (action === 'remove') updateLine(line, 0);
    });

    cartRoot.addEventListener('change', function (ev) {
      var input = ev.target.closest('[data-line-qty-input]');
      if (!input) return;
      var row = input.closest('[data-line-row]');
      if (!row) return;
      var line = parseInt(row.getAttribute('data-line-index'), 10);
      var n = Math.max(0, parseInt(input.value, 10) || 0);
      updateLine(line, n);
    });

    var noteForm = cartRoot.querySelector('[data-cart-note-form]');
    if (noteForm) {
      var noteField = noteForm.querySelector('textarea[name="note"]');
      var saveTimer;
      if (noteField) {
        noteField.addEventListener('input', function () {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            fetch('/cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ note: noteField.value })
            }).catch(function () { /* silent */ });
          }, 600);
        });
      }
    }
  }

  /* ─── Hero bin SVG animation ─── */
  initHeroBinAnimations();

  function initHeroBinAnimations() {
    var illustration  = document.getElementById('bin-illustration');
    var sceneWrap     = document.getElementById('scene-wrap');
    var dumpGroup     = document.getElementById('dump-group');
    var lid           = document.getElementById('bin-lid');
    var flag          = document.getElementById('bin-flag');
    var sparkles      = document.getElementById('bin-sparkles');

    if (!dumpGroup || !lid || !flag) return;

    var ENTRANCE_DELAY        = 900;
    var DUMP_ROTATE_DURATION  = 2000;
    /* The lid waits until the bin has tilted past ~-30° (critical angle
       where gravity overcomes the lid sitting on the rim), then swings
       open over a span that lands just before the bin reaches max tilt. */
    var LID_GRAVITY_DELAY     = 750;
    var LID_GRAVITY_DURATION  = 850;
    var FLAG_HANG_DELAY       = 400;
    var FLAG_HANG_DURATION    = 1900;
    var HOLD_DOWN_DURATION    = 2500;
    var DUMP_RETURN_DURATION  = 1800;
    /* On the return, the lid starts closing the moment the arm starts
       coming back down and travels at the same pace as the bin so they
       finish together — the gravitySlam easing keeps a small bounce in
       the last ~20% as the lid meets the rim just before the bin lands. */
    var LID_CLOSE_DELAY       = 0;
    var LID_CLOSE_DURATION    = 1800;
    var FLAG_SWING_DURATION   = 1800;
    var FLAG_RISE_DURATION    = 300;
    var LOOP_PAUSE            = 2500;

    var DUMP_ANGLE       = -130;
    var LID_OPEN_ANGLE   = -119;
    var FLAG_HANG_ANGLE  = -70;
    var FLAG_DOWN_ANGLE  = -180;
    var BIN_SCALE        = 0.82;

    var loopTimeout = null;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    /* Gravity-driven open: cubic acceleration, a touch of overshoot at
       the open stop, then a damped settle. Looks like a heavy lid
       falling open and clattering against the bin's back. */
    function gravityOpen(t) {
      if (t < 0.85) {
        var u = t / 0.85;
        return 1.04 * u * u * u;
      }
      var u = (t - 0.85) / 0.15;
      return 1.04 - 0.04 * (1 - Math.pow(1 - u, 2));
    }
    /* Gravity-driven slam: quadratic acceleration to closed, slight
       overshoot (lid hits the rim), small damped bounce, then rest. */
    function gravitySlam(t) {
      if (t < 0.78) {
        var u = t / 0.78;
        return 1.06 * u * u;
      }
      var u = (t - 0.78) / 0.22;
      return 1.06 - 0.06 * (1 - Math.pow(1 - u, 2));
    }

    /* Cache last-applied transforms to skip redundant style writes when
       multiple parallel tweens settle on the same value. */
    var lastDump = null, lastLid = null, lastFlag = null;
    function setDumpGroup(angle) {
      if (angle === lastDump) return;
      lastDump = angle;
      dumpGroup.style.transform = 'translate3d(0,0,0) rotate(' + angle.toFixed(2) + 'deg) scale(' + BIN_SCALE + ')';
    }
    function setLid(angle) {
      if (angle === lastLid) return;
      lastLid = angle;
      lid.style.transform = 'translate3d(0,0,0) rotate(' + angle.toFixed(2) + 'deg)';
    }
    function setFlag(angle) {
      if (angle === lastFlag) return;
      lastFlag = angle;
      flag.style.transform = 'translate3d(0,0,0) rotate(' + angle.toFixed(2) + 'deg)';
    }
    function setIndicatorState(isDown) {
      if (sceneWrap) sceneWrap.classList.toggle('is-empty', !!isDown);
    }
    function fireSparkles() {
      if (!sparkles) return;
      sparkles.classList.remove('is-active');
      void sparkles.offsetWidth;
      sparkles.classList.add('is-active');
    }
    function tween(from, to, duration, easeFn, onUpdate, onComplete) {
      var start = performance.now();
      function tick(now) {
        var t = Math.min((now - start) / duration, 1);
        onUpdate(from + (to - from) * easeFn(t), t);
        if (t < 1) requestAnimationFrame(tick);
        else if (onComplete) onComplete();
      }
      requestAnimationFrame(tick);
    }
    function resetState() {
      setDumpGroup(0); setLid(0); setFlag(0); setIndicatorState(false);
    }
    function runCycle() {
      var forwardDone = 0;
      function onForwardPartDone() {
        forwardDone++;
        if (forwardDone < 3) return;
        setIndicatorState(true);
        fireSparkles();
        loopTimeout = setTimeout(function () {
          var step1Done = 0;
          function onStep1Done() {
            step1Done++;
            if (step1Done < 3) return;
            loopTimeout = setTimeout(function () {
              tween(FLAG_DOWN_ANGLE, 0, FLAG_RISE_DURATION, easeOutCubic, setFlag, function () {
                setIndicatorState(false);
                loopTimeout = setTimeout(runCycle, LOOP_PAUSE);
              });
            }, 2500);
          }
          /* Bin pivots back upright; lid stays open until the bin tips
             back past the critical angle, then slams shut under gravity. */
          tween(DUMP_ANGLE, 0, DUMP_RETURN_DURATION, easeInOutCubic, setDumpGroup, onStep1Done);
          loopTimeout = setTimeout(function () {
            tween(LID_OPEN_ANGLE, 0, LID_CLOSE_DURATION, gravitySlam, setLid, onStep1Done);
          }, LID_CLOSE_DELAY);
          tween(FLAG_HANG_ANGLE, FLAG_DOWN_ANGLE, FLAG_SWING_DURATION, easeInOutCubic, setFlag, onStep1Done);
        }, HOLD_DOWN_DURATION);
      }
      /* Bin tips forward; lid waits for the critical angle, then falls
         open with cubic gravity acceleration and clatters at the stop. */
      tween(0, DUMP_ANGLE, DUMP_ROTATE_DURATION, easeInOutCubic, setDumpGroup, onForwardPartDone);
      setTimeout(function () {
        tween(0, LID_OPEN_ANGLE, LID_GRAVITY_DURATION, gravityOpen, setLid, onForwardPartDone);
      }, LID_GRAVITY_DELAY);
      setTimeout(function () {
        tween(0, FLAG_HANG_ANGLE, FLAG_HANG_DURATION, easeOutCubic, setFlag, onForwardPartDone);
      }, FLAG_HANG_DELAY);
    }

    if (prefersReduced) {
      resetState();
      setIndicatorState(true);
      return;
    }

    var running = false;
    function start() {
      if (running) return;
      running = true;
      resetState();
      runCycle();
    }
    function stop() {
      running = false;
      if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null; }
      resetState();
    }
    if ('IntersectionObserver' in window && illustration) {
      var visObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setTimeout(start, ENTRANCE_DELAY);
          else stop();
        });
      }, { threshold: 0 });
      visObs.observe(illustration);
    } else {
      setTimeout(start, ENTRANCE_DELAY);
    }
  }
})();
