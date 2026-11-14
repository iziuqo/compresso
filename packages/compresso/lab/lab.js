/**
 * The device lab's own script: reads the environment, runs the checks that
 * checks.mjs registers, shows them, and builds the report.
 *
 * ES5 syntax only (var, function, no arrows, classes, template literals,
 * let/const or async/await), and no API it doesn't feature-detect first, so a
 * browser too old for the library still shows what it is and why nothing ran,
 * instead of a blank page. The library and the checks live in checks.mjs, a
 * module script, because the library itself needs a modern browser.
 *
 * Nothing is sent anywhere unless the page is opened with `?report=<url>`;
 * then the finished report is POSTed there as JSON (CI uses this).
 */
(function () {
  'use strict';

  /** How long after `load` checks.mjs has to register before the page says the library did not load. */
  var REGISTER_GRACE_MS = 1000;
  var TRUNCATE = 240;

  var params = parseQuery(location.search);
  // Only http(s), so a link can't make the page post anywhere stranger; the
  // page names the address before it runs.
  var reportTo = /^https?:\/\//i.test(params.report || '') ? params.report : null;
  var started = new Date();
  var errors = [];
  var report = {
    page: 'compresso.js device lab',
    url: location.pathname + location.search,
    startedAt: started.toISOString(),
    finishedAt: null,
    complete: false,
    reportTo: reportTo,
    env: environment(),
    library: { loaded: false },
    checks: [],
    summary: null,
    pageErrors: errors
  };
  var registered = false;
  var finished = false;

  // Errors anywhere on the page go into the report: on a device they may be
  // the only clue. Listening in the capture phase also hears a script that
  // fails to load (a module script does that when any module it imports does).
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target.tagName === 'SCRIPT') return errors.push('could not load ' + target.src + ' or a module it imports');
    errors.push(String(event.message) + (event.filename ? ' (' + event.filename.split('/').pop() + ':' + event.lineno + ')' : ''));
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    errors.push('unhandled rejection: ' + errorText(event.reason));
  });

  /** What checks.mjs calls once the library has loaded: `{ env, checks, afterEach }`. */
  window.compressoLab = {
    ready: function (suite) {
      if (registered || finished) return;
      registered = true;
      report.library = { loaded: true };
      start(suite);
    }
  };

  window.addEventListener('load', function () {
    setTimeout(function () {
      if (registered) return;
      // A captured error first: some browsers run modules but lack `noModule`.
      var why = errors.length ? errors[errors.length - 1]
        : !report.env.features.modules ? 'this browser does not run module scripts'
        : 'checks.mjs did not register (is dist/ built and served?)';
      report.library = { loaded: false, error: why };
      addRow({ name: 'library', pass: false, finding: null, error: 'library did not load: ' + why, details: {} });
      finish();
    }, REGISTER_GRACE_MS);
  });

  onReady(function () {
    byId('copy').onclick = copyReport;
    renderEnv(report.env, report.library.env);
    if (!finished && !registered) setStatus('Loading the library…' + (reportTo ? ' When done, the report goes to ' + reportTo + '.' : ''));
  });

  /* ------------------------------------------------------------ the run */

  /** Runs the selected checks one after another, then finishes the report. */
  function start(suite) {
    report.library.env = attempt(suite.env);
    renderEnv(report.env, report.library.env);
    if (typeof Promise === 'undefined') {
      addRow({ name: 'runner', pass: false, finding: null, error: 'this browser has no Promise, so no check can run', details: {} });
      return finish();
    }
    var queue = select(suite.checks, params.only);
    var next = function () {
      var check = queue.shift();
      if (!check) return finish();
      if (check.missing) {
        addRow({ name: check.name, pass: false, finding: null, error: 'no check named "' + check.name + '"', details: {} });
        return next();
      }
      setStatus('Running ' + check.name + '…');
      return runOne(check).then(function (row) {
        addRow(row);
        attempt(suite.afterEach);
        return next();
      });
    };
    highEntropyHints().then(next);
  }

  /**
   * One check, settled within its timeout. A returned failure is the symptom
   * the check measures, so it carries the check's finding (or the one the
   * check names); a thrown error or a timeout is something else, so it
   * carries none, and a known-failure entry can't absorb it.
   */
  function runOne(check) {
    var begun = now();
    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        done({ pass: false, error: 'timed out after ' + check.timeout / 1000 + ' s' });
      }, check.timeout);
      function done(outcome) {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
        var row = {
          name: check.name,
          about: check.finding || null,
          pass: outcome.pass === true,
          finding: null,
          summary: outcome.summary || null,
          details: outcome.details || {},
          error: outcome.error || null,
          ms: Math.round(now() - begun)
        };
        if (!row.pass && !outcome.error) row.finding = outcome.finding !== undefined ? outcome.finding : row.about;
        resolve(row);
      }
      var running;
      try {
        running = Promise.resolve(check.run());
      } catch (error) {
        running = Promise.reject(error);
      }
      running.then(done, function (error) { done({ pass: false, error: errorText(error) }); });
    });
  }

  /** The checks `?only=a,b` names, in the page's order, plus a placeholder for each unknown name. */
  function select(checks, only) {
    if (!only) return checks.slice();
    var wanted = only.split(',');
    var picked = [];
    var i;
    for (i = 0; i < checks.length; i++) if (indexOf(wanted, checks[i].name) >= 0) picked.push(checks[i]);
    for (i = 0; i < wanted.length; i++) {
      if (wanted[i] && !find(checks, wanted[i])) picked.push({ name: wanted[i], missing: true });
    }
    return picked;
  }

  function finish() {
    if (finished) return;
    finished = true;
    var passed = 0;
    for (var i = 0; i < report.checks.length; i++) if (report.checks[i].pass) passed++;
    report.summary = { passed: passed, failed: report.checks.length - passed };
    report.finishedAt = new Date().toISOString();
    report.complete = true;
    window.labReport = report;
    renderJson();
    setStatus('Done: ' + passed + ' of ' + report.checks.length + ' checks passed.' + (reportTo ? ' Sending the report to ' + reportTo + '…' : ''));
    document.documentElement.setAttribute('data-lab-done', 'true');
    if (reportTo) send(reportTo);
  }

  /** POSTs the report as text/plain, a simple request any server, cross-origin too, can take. */
  function send(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
    xhr.onload = function () { appendStatus(' Report sent (HTTP ' + xhr.status + ').'); };
    // A server that takes the report but sends no CORS headers lands here too.
    xhr.onerror = function () { appendStatus(' No readable answer from ' + url + ': the report may not have arrived.'); };
    xhr.send(JSON.stringify(report));
  }

  /* ------------------------------------------------------------ the environment */

  /** What this browser says about itself, and which features the lab and the library lean on. */
  function environment() {
    var nav = window.navigator;
    var ua = nav.userAgent;
    var script = document.createElement('script');
    var browser = parseBrowser(ua);
    return {
      userAgent: ua,
      browser: browser,
      os: parseOs(ua, browser, nav.maxTouchPoints || 0),
      platform: nav.platform || null,
      userAgentData: nav.userAgentData ? { brands: nav.userAgentData.brands, mobile: nav.userAgentData.mobile, platform: nav.userAgentData.platform } : null,
      cores: nav.hardwareConcurrency || null,
      deviceMemory: nav.deviceMemory || null,
      maxTouchPoints: nav.maxTouchPoints || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
      screen: [screen.width, screen.height],
      secureContext: window.isSecureContext === true,
      features: {
        promise: typeof Promise !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        modules: 'noModule' in script,
        importMaps: typeof HTMLScriptElement !== 'undefined' && typeof HTMLScriptElement.supports === 'function' && HTMLScriptElement.supports('importmap'),
        worker: typeof Worker !== 'undefined',
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        createImageBitmap: typeof createImageBitmap !== 'undefined',
        clipboard: !!(nav.clipboard && nav.clipboard.writeText)
      }
    };
  }

  /**
   * The browser's name and version from its own token. Safari's comes from
   * `Version/`, the only place it is current: iOS 26 Safari still says
   * "iPhone OS 18_7". Every browser on iOS is WebKit, whatever it is called.
   */
  function parseBrowser(ua) {
    var rules = [
      ['Edge', /\bEdg(?:e|A|iOS)?\/(\d[\d.]*)/, 'Blink'],
      ['Samsung Internet', /\bSamsungBrowser\/(\d[\d.]*)/, 'Blink'],
      ['Opera', /\bOPR\/(\d[\d.]*)/, 'Blink'],
      ['Firefox', /\b(?:Firefox|FxiOS)\/(\d[\d.]*)/, 'Gecko'],
      ['Chrome', /\b(?:HeadlessChrome|Chrome|CriOS)\/(\d[\d.]*)/, 'Blink'],
      ['Safari', /\bVersion\/(\d[\d.]*).*\bSafari\//, 'WebKit']
    ];
    // iPadOS asking for desktop sites says "Macintosh", but these tokens are iOS-only.
    var ios = /\b(iPhone|iPad|iPod)\b|\b(?:FxiOS|CriOS|EdgiOS)\//.test(ua);
    for (var i = 0; i < rules.length; i++) {
      var match = rules[i][1].exec(ua);
      if (match) return { name: rules[i][0], version: match[1], engine: ios ? 'WebKit' : rules[i][2] };
    }
    return { name: 'unknown', version: null, engine: /AppleWebKit\//.test(ua) ? 'WebKit' : /Gecko\//.test(ua) ? 'Gecko' : 'unknown' };
  }

  /**
   * The operating system. On iOS (and iPadOS asking for desktop sites, which
   * says "Macintosh") Safari's version is the OS version, and the only true
   * one from iOS 26 on; the OS number the user agent claims is kept beside it.
   */
  function parseOs(ua, browser, touchPoints) {
    var match = /\bOS (\d+)_(\d+)(?:_(\d+))? like Mac OS X/.exec(ua);
    var fromSafari = browser.name === 'Safari' ? browser.version : null;
    if (match) {
      var claimed = match[1] + '.' + match[2] + (match[3] ? '.' + match[3] : '');
      // From iOS 26 the user agent's number is frozen at 18: without Safari's
      // `Version/` (other browsers, in-app views) an 18.x can't be trusted.
      return { name: /\biPad\b/.test(ua) ? 'iPadOS' : 'iOS', version: fromSafari || (+match[1] >= 18 ? null : claimed), userAgentSays: claimed };
    }
    if (/\bMacintosh\b/.test(ua) && touchPoints > 1) return { name: 'iPadOS', version: fromSafari, userAgentSays: 'Macintosh (desktop-class site)' };
    var known = [
      ['Android', /\bAndroid (\d[\d.]*)/],
      ['Windows', /\bWindows NT (\d[\d.]*)/],
      ['macOS', /\bMac OS X (\d+[_.]\d+(?:[_.]\d+)?)/],
      ['ChromeOS', /\bCrOS \S+ (\d[\d.]*)/],
      ['Linux', /\bLinux\b()/]
    ];
    for (var i = 0; i < known.length; i++) {
      match = known[i][1].exec(ua);
      if (match) return { name: known[i][0], version: match[1] ? match[1].replace(/_/g, '.') : null };
    }
    return { name: 'unknown', version: null };
  }

  /** Chromium's detailed client hints (OS version, device model), when it offers them. */
  function highEntropyHints() {
    var data = navigator.userAgentData;
    if (!data || !data.getHighEntropyValues) return Promise.resolve();
    return data.getHighEntropyValues(['platformVersion', 'model', 'fullVersionList', 'architecture']).then(function (values) {
      report.env.userAgentData = values;
      // Windows, macOS and Android freeze the version in the user agent; this one is real.
      if (values.platformVersion) report.env.os.platformVersion = values.platformVersion;
    }, function () {});
  }

  /* ------------------------------------------------------------ the page */

  function renderEnv(env, library) {
    var list = byId('env');
    if (!list) return;
    list.innerHTML = '';
    var os = env.os.name + (env.os.version ? ' ' + env.os.version : '') + (env.os.userAgentSays ? ' (user agent says ' + env.os.userAgentSays + ')' : '');
    var pairs = [
      ['Browser', env.browser.name + ' ' + (env.browser.version || '') + ' (' + env.browser.engine + ')'],
      ['OS', os],
      ['Cores, memory', (env.cores || '?') + ' cores, ' + (env.deviceMemory ? env.deviceMemory + ' GB' : 'memory not reported')],
      ['Features', flags(env.features)],
      ['User agent', env.userAgent]
    ];
    if (library) {
      pairs.splice(3, 0, ['Library', 'best format ' + library.getBestFormat + ', pool ' + (library.isPoolSupported ? 'supported' : 'not supported') + ', encodes ' + flags(library.isFormatSupported)]);
    }
    for (var i = 0; i < pairs.length; i++) {
      list.appendChild(element('dt', pairs[i][0]));
      list.appendChild(element('dd', pairs[i][1]));
    }
  }

  function addRow(row) {
    report.checks.push(row);
    var body = byId('rows');
    if (!body) return;
    var tr = document.createElement('tr');
    tr.className = row.pass ? 'pass' : 'fail';
    tr.appendChild(element('td', row.name));
    tr.appendChild(element('td', row.pass ? 'pass' : 'FAIL'));
    tr.appendChild(element('td', row.finding || (row.about ? '(' + row.about + ')' : '')));
    var text = row.error || row.summary || JSON.stringify(row.details);
    tr.appendChild(element('td', text.length > TRUNCATE ? text.slice(0, TRUNCATE) + '…' : text));
    body.appendChild(tr);
    renderJson();
  }

  function renderJson() {
    var pre = byId('json');
    if (pre) pre.textContent = JSON.stringify(report, null, 2);
  }

  /** Copies the report so far: the clipboard API where there is one, a selected textarea otherwise. */
  function copyReport() {
    var text = JSON.stringify(report, null, 2);
    var copied = function () { appendStatus(' Report copied.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(copied, function () { copyWithTextarea(text, copied); });
    } else {
      copyWithTextarea(text, copied);
    }
  }

  function copyWithTextarea(text, copied) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length); // iOS selects nothing without this
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    if (ok) return copied();
    byId('full').open = true;
    appendStatus(' Copying is blocked here: select the JSON below by hand.');
  }

  /* ------------------------------------------------------------ helpers */

  function setStatus(text) {
    var node = byId('status');
    if (node) node.textContent = text;
  }

  function appendStatus(text) {
    var node = byId('status');
    if (node) node.textContent += text;
  }

  function flags(object) {
    var out = [];
    for (var key in object) if (object.hasOwnProperty(key)) out.push(key + (object[key] ? ' yes' : ' no'));
    return out.join(', ');
  }

  /** Calls `fn` (if any), turning a throw into `{ error }` so one broken hook can't stop the run. */
  function attempt(fn) {
    try {
      return fn ? fn() : null;
    } catch (error) {
      return { error: errorText(error) };
    }
  }

  function errorText(error) {
    if (!error) return String(error);
    var text = (error.name ? error.name + ': ' : '') + (error.message || String(error));
    return error.kind ? text + ' (kind ' + error.kind + ')' : text;
  }

  function parseQuery(search) {
    var out = {};
    var parts = search.replace(/^\?/, '').split('&');
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var eq = parts[i].indexOf('=');
      var key = decode(eq < 0 ? parts[i] : parts[i].slice(0, eq));
      out[key] = eq < 0 ? '' : decode(parts[i].slice(eq + 1).replace(/\+/g, ' '));
    }
    return out;
  }

  /** decodeURIComponent that keeps a malformed escape (`?only=50%`) as typed. */
  function decode(text) {
    try {
      return decodeURIComponent(text);
    } catch (error) {
      return text;
    }
  }

  function now() {
    return window.performance && performance.now ? performance.now() : new Date().getTime();
  }

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function element(tag, text) {
    var node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function indexOf(list, value) {
    for (var i = 0; i < list.length; i++) if (list[i] === value) return i;
    return -1;
  }

  function find(checks, name) {
    for (var i = 0; i < checks.length; i++) if (checks[i].name === name) return checks[i];
    return null;
  }
})();
