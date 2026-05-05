// Shadow of core's sendAppPage. Substitutes the doc-page HTML so
// unmodified nbrowser tests can drive a grist-static client. Picked up
// by Node when NODE_PATH puts _build/ext ahead of _build.
//
// The relative-path import below bypasses our own shadow. tsc sees ext/
// as core/ext/ via the make-requirements symlink, so going up four lands
// at core/.

import * as upstream from '../../../../app/server/lib/sendAppPage';
import * as express from 'express';

export const makeGristConfig = upstream.makeGristConfig;
export const makeMessagePage = upstream.makeMessagePage;
export type ISendAppPageOptions = upstream.ISendAppPageOptions;
export type MakeGristConfigOptions = upstream.MakeGristConfigOptions;
export type SendAppPageFunction = upstream.SendAppPageFunction;

// HTML template fed through upstream's makeSendAppPage so its
// INSERT CONFIG / INSERT BASE markers still get filled in. Mirrors
// core/static/app.html, except the final main.bundle.js is replaced
// by a router: doc URLs (assignmentId set) load pipe/bootstrap.js
// and call bootstrapGrist; everything else loads main.bundle.js.
const STATIC_DOC_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf8">
<!-- INSERT META -->

<!-- INSERT BASE -->

<link rel="icon" type="image/x-icon" href="icons/favicon.png" />

<link rel="stylesheet" href="jqueryui/themes/smoothness/jquery-ui.css">
<link rel="stylesheet" href="hljs.default.css">
<link rel="stylesheet" href="bootstrap-datepicker/dist/css/bootstrap-datepicker3.min.css">
<link rel="stylesheet" href="bundle.css">
<link rel="stylesheet" href="icons/icons.css">
<!-- INSERT LOCALE -->
<!-- INSERT CONFIG -->
<!-- INSERT CUSTOM -->
<!-- INSERT CUSTOM SCRIPT -->

<title><!-- INSERT TITLE --><!-- INSERT TITLE SUFFIX --></title>
</head>
<body>
  <!-- INSERT WARNING -->
  <div id='grist-logo-wrapper'>
    <div class='grist-logo'>
      <div class='grist-logo-head'>
        <div class='grist-logo-grain grain-empty'></div>
        <div class='grist-logo-grain grain-col grain-flip grain-2'></div>
        <div class='grist-logo-grain grain-col grain-3'></div>
      </div>
      <div class='grist-logo-row'>
        <div class='grist-logo-grain grain-row grain-flip grain-4'></div>
        <div class='grist-logo-grain grain-cell grain-flip grain-5'></div>
        <div class='grist-logo-grain grain-cell grain-6'></div>
      </div>
      <div class='grist-logo-row'>
        <div class='grist-logo-grain grain-row grain-flip grain-7'></div>
        <div class='grist-logo-grain grain-cell grain-flip grain-8'></div>
        <div class='grist-logo-grain grain-cell grain-9'></div>
      </div>
    </div>
  </div>

  <!-- Test harness loads first so it captures errors from later scripts. -->
  <script src="test-harness.bundle.js" crossorigin="anonymous"></script>
  <script src="jquery/dist/jquery.min.js" crossorigin="anonymous"></script>
  <script src="jqueryui/jquery-ui.min.js" crossorigin="anonymous"></script>
  <script src="bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js" crossorigin="anonymous"></script>
  <script>
  (function () {
    var cfg = window.gristConfig || {};
    function load(src, onload) {
      var s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      if (onload) { s.onload = onload; }
      document.head.appendChild(s);
    }
    if (cfg.assignmentId) {
      load('pipe/bootstrap.js', function () {
        window.bootstrapGrist({
          initialFile: '/api/docs/' + cfg.assignmentId + '/download',
          fakeDocId: cfg.assignmentId,
          trace: true,
          testRefreshPersistence: true,
        });
      });
    } else {
      load('main.bundle.js');
    }
  })();
  </script>
  <script type="application/javascript" src="browser-check.js" crossorigin="anonymous"></script>

</body>
</html>`;

export function makeSendAppPage(opts: Parameters<typeof upstream.makeSendAppPage>[0]): SendAppPageFunction {
  const real = upstream.makeSendAppPage(opts);
  return async (req: express.Request, res: express.Response, options: ISendAppPageOptions) => {
    // Two paths land here: 'app.html' (home + most app pages), and ''
    // with content set (doc page, see AppEndpoint.ts). assignmentId
    // tells us which is which; both want our static HTML.
    const cfg: any = options.config || {};
    const isDocPage = !!cfg.assignmentId;
    const isAppShell = isDocPage || options.path === 'app.html';
    if (isAppShell) {
      if (isDocPage) {
        const origSend = res.send.bind(res);
        (res as any).send = function (data: any) {
          try { require('fs').writeFileSync('/tmp/grist-static-rendered-doc.html', data); }
          catch (_e) { /* ignore */ }
          return origSend(data);
        };
      }
      return real(req, res, {...options, path: '', content: STATIC_DOC_HTML});
    }
    // Log error.html paths so 404'ing assets show up.
    if (options.path === 'error.html') {
      try {
        require('fs').appendFileSync('/tmp/grist-static-404s.log',
          new Date().toISOString() + ' ' + req.method + ' ' + (req.originalUrl || req.url) + '\n');
      } catch (_e) { /* ignore */ }
    }
    return real(req, res, options);
  };
}
