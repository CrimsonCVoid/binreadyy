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

      var variantId = form.querySelector('input[name="id"]:checked, input[name="id"]');
      if (!variantId) return;

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(variantId.value, 10),
          quantity: 1
        })
      })
      .then(function (res) {
        if (!res.ok) throw new Error('Cart error');
        return res.json();
      })
      .then(function () {
        btn.innerHTML = 'Added &#10003;';
        setTimeout(function () {
          window.location.href = '/cart';
        }, 600);
      })
      .catch(function () {
        btn.innerHTML = 'Error — try again';
        btn.disabled = false;
        setTimeout(function () { btn.innerHTML = originalText; }, 2000);
      });
    });
  });

  /* ─── Variant picker sync (hero ↔ final-buy) ─── */
  var radios = document.querySelectorAll('.pricing-picker input[type="radio"]');
  function syncVariant(sourceRadio) {
    var variantId = sourceRadio
      ? sourceRadio.value
      : (document.querySelector('.pricing-picker input[type="radio"]:checked') || {}).value;
    if (!variantId) return;

    radios.forEach(function (r) {
      r.checked = (r.value === variantId);
    });

    /* Update all hidden variant ID inputs in add-to-cart forms */
    document.querySelectorAll('.js-variant-id').forEach(function (hidden) {
      hidden.value = variantId;
    });

    /* Update price labels from data attributes */
    var checkedRadio = document.querySelector('.pricing-picker input[type="radio"]:checked');
    if (checkedRadio) {
      var price = checkedRadio.getAttribute('data-price');
      document.querySelectorAll('.buy-price').forEach(function (el) {
        el.textContent = price;
      });
    }
  }
  radios.forEach(function (r) {
    r.addEventListener('change', function () { syncVariant(r); });
  });
  syncVariant();

  /* ─── Hero bin SVG animation ─── */
  initHeroBinAnimations();

  function initHeroBinAnimations() {
    var illustration  = document.getElementById('bin-illustration');
    var sceneWrap     = document.getElementById('scene-wrap');
    var dumpGroup     = document.getElementById('dump-group');
    var lid           = document.getElementById('bin-lid');
    var flag          = document.getElementById('bin-flag');
    var binShadow     = document.getElementById('bin-shadow');
    var sparkles      = document.getElementById('bin-sparkles');
    var lidShadow     = document.getElementById('lid-shadow');

    if (!dumpGroup || !lid || !flag) return;

    var ENTRANCE_DELAY        = 900;
    var DUMP_ROTATE_DURATION  = 2000;
    var LID_GRAVITY_DELAY     = 500;
    var LID_GRAVITY_DURATION  = 900;
    var FLAG_HANG_DELAY       = 400;
    var FLAG_HANG_DURATION    = 1900;
    var HOLD_DOWN_DURATION    = 2500;
    var DUMP_RETURN_DURATION  = 1800;
    var LID_CLOSE_DURATION    = 700;
    var FLAG_SWING_DURATION   = 1800;
    var FLAG_RISE_DURATION    = 300;
    var LOOP_PAUSE            = 2500;

    var DUMP_ANGLE       = -110;
    var LID_OPEN_ANGLE   = -80;
    var FLAG_HANG_ANGLE  = -70;
    var FLAG_DOWN_ANGLE  = -180;

    var loopTimeout = null;

    function easeOutBounce(t) {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function setDumpGroup(angle) {
      dumpGroup.style.transform = 'rotate(' + angle + 'deg)';
      if (binShadow) {
        var progress = Math.abs(angle / DUMP_ANGLE);
        binShadow.setAttribute('rx', String(95 - 50 * progress));
        binShadow.setAttribute('fill', 'rgba(0,0,0,' + Math.max(0, 0.18 - 0.14 * progress) + ')');
      }
    }
    function setLid(angle) {
      lid.style.transform = 'rotate(' + angle + 'deg)';
      if (lidShadow) {
        var progress = Math.abs(angle / LID_OPEN_ANGLE);
        lidShadow.setAttribute('fill', 'rgba(0,0,0,' + (0.08 * progress) + ')');
        lidShadow.setAttribute('rx', String(64 + 16 * progress));
      }
    }
    function setFlag(angle) { flag.style.transform = 'rotate(' + angle + 'deg)'; }
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
          tween(DUMP_ANGLE, 0, DUMP_RETURN_DURATION, easeInOutCubic, setDumpGroup, onStep1Done);
          tween(LID_OPEN_ANGLE, 0, LID_CLOSE_DURATION, easeInOutCubic, setLid, onStep1Done);
          tween(FLAG_HANG_ANGLE, FLAG_DOWN_ANGLE, FLAG_SWING_DURATION, easeInOutCubic, setFlag, onStep1Done);
        }, HOLD_DOWN_DURATION);
      }
      tween(0, DUMP_ANGLE, DUMP_ROTATE_DURATION, easeInOutCubic, setDumpGroup, onForwardPartDone);
      setTimeout(function () {
        tween(0, LID_OPEN_ANGLE, LID_GRAVITY_DURATION, easeOutBounce, setLid, onForwardPartDone);
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
