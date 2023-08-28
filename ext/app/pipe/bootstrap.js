// Guess at where Grist assets live.
const settings = window.gristOverrides = {};
const bootstrapGristSource = document.currentScript?.src;
const bootstrapGristRelative = '..';
const bootstrapGristPrefix = bootstrapGristSource ? new URL(bootstrapGristRelative, bootstrapGristSource).href : '';
// This next line should be left alone, there is a release script
// that fiddles with it when prefix is none.
settings.bootstrapGristPrefix = bootstrapGristPrefix;

/**
 * Kickstart Grist. See README for options.
 */
function bootstrapGrist(options) {
  const bootstrapGristLocation = options.pageLocation || window.location.href;
  const bootstrapGristSourceAbsolute = new URL(bootstrapGristSource).href;
  if (options.elementId || options.element) {
    // Grist should be opened within a page element, and not
    // take over the entire page.
    let element = options.element ?? document.getElementById(options.elementId);
    const iframeElement = document.createElement('iframe');

    // Prepare nested options. Remove element id, and add the page location
    // (the iframe will have a location like about:srcdoc). Convert the
    // options into a quoted string - we don't expect hostility from
    // caller who has full script rights already, but perhaps something
    // nasty could be snuck into the location?
    const nestedOptions = {...options};
    delete nestedOptions.elementId;
    delete nestedOptions.element;
    nestedOptions.pageLocation = bootstrapGristLocation;
    function escapeJsonForScript(jsonString) {
      return jsonString.replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/'/g, '\\u0027')
        .replace(/&/g, '\\u0026')
        .replace(/`/g, '\\u0060');
    }
    const nestedOptionsStr = escapeJsonForScript(JSON.stringify(nestedOptions));

    // Set up the iframe, and add it to the page.
    iframeElement.srcdoc = `
<!doctype html>
<html>
  <head>
    <meta charset="utf8">
    <script src="${bootstrapGristSourceAbsolute}"></script>
    <title>Grist</title>
  </head>
  <body>
    <script>
      bootstrapGrist(JSON.parse("${nestedOptionsStr}"));
    </script>
  </body>
</html>
`;
    iframeElement.style.width = '100%';
    iframeElement.style.height = '100%';
    iframeElement.style.border = 'none';
    element.innerHTML = '';
    element.appendChild(iframeElement);

    // And we're done, in the embedded case.
    return;
  }

  if (!globalThis.setImmediate) {
    // make do
    globalThis.setImmediate = (fn) => setTimeout(fn, 0);
  }

  options = options || {};
  const seedFile = options.initialFile;
  const homeUrl = new URL('.', bootstrapGristLocation).href;
  settings.staticGristOptions = options;
  if (seedFile) {
    settings.seedFile = new URL(seedFile, bootstrapGristLocation);
  }
  if (options.initialContent) {
    settings.initialContent = options.initialContent;
  } else if (options.initialData) {
    settings.initialData = options.initialData;
  }
  const fakeDocId = "new~2d6rcxHotohxAuTxttFRzU";
  const fakeUrl = "https://example.com/o/docs/doc/new~2d6rcxHotohxAuTxttFRzU";
  settings.fakeUrl = fakeUrl;
  settings.fakeDocId = fakeDocId;
  if (options.singlePage) {
    settings.singlePage = Boolean(options.singlePage);
  }
  window.gristConfig = {
    "homeUrl":homeUrl,
    "org":"docs",
    "baseDomain":null,
    "singleOrg":null,
    "helpCenterUrl":"https://support.getgrist.com",
    "pathOnly":true,
    "supportAnon":false,
    "supportEngines":null,
    "hideUiElements":["helpCenter", "billing", "templates", "multiSite", "multiAccounts"],
    "pageTitleSuffix":null,
    "pluginUrl":"http://plugins.invalid",
    "stripeAPIKey":null,
    "googleClientId":null,
    "googleDriveScope":null,
    "helpScoutBeaconId":null,
    "maxUploadSizeImport":null,
    "maxUploadSizeAttachment":null,
    "timestampMs":1678573297305,
    "enableWidgetRepository":true,
    "survey":false,
    "tagManagerId":null,
    "activation":{"isManager":false},
    "enableCustomCss":false,
    "supportedLngs":["de","en","es","fr","nb_NO","pt_BR"],
    "namespaces":["client","server"],
    "featureComments":false,
    "supportEmail":"support@getgrist.com",
    "assignmentId":"new~2d6rcxHotohxAuTxttFRzU",
    "plugins":[]
  };

  const css = [
    "jqueryui/themes/smoothness/jquery-ui.css",
    "bootstrap/dist/css/bootstrap.min.css",
    "hljs.default.css",
    "bootstrap-datepicker/dist/css/bootstrap-datepicker3.min.css",
    "bundle.css",
    "icons/icons.css",
  ];
  const js = [
    "jquery/dist/jquery.min.js",
    "jqueryui/jquery-ui.min.js",
    "bootstrap/dist/js/bootstrap.min.js",
    "bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js",
    "main.bundle.js"
  ];
  const prefix = settings.bootstrapGristPrefix || '';
  for (const src of css) {
    const asset = document.createElement('link');
    asset.setAttribute('rel', 'stylesheet');
    asset.setAttribute('crossorigin', 'anonymous');
    asset.async = false;
    asset.setAttribute('href', prefix + src);
    document.body.appendChild(asset);
  }

  for (const src of js) {
    const asset = document.createElement('script');
    asset.setAttribute('crossorigin', 'anonymous');
    asset.setAttribute('src', prefix + src);
    asset.async = false;
    document.body.appendChild(asset);
  }

  // Sometimes the file takes a while to load, so we show a loader. Currently it is only used on a popup.
  if (options.loader) {
    const loader = document.createElement('div');
    loader.id = 'grist-static-loader';
    // This loader is almost identical to the one in the main app (see core/static/app.html).
    // Differences:
    // - It has different id, so it doesn't get removed by the main app.
    // - Few styles added (z-index, background-color, font-size, line-height, font-family)
    loader.innerHTML = `
      <style>
        #grist-static-loader {
          position: absolute;
          width: 100vw;
          height: 100vh;
          display: flex;
          z-index: 1;
          background-color: var(--color-logo-bg, #42494b);
          /* Fonts are styled later and this element relies on the font size. Otherwise there is a slight size shift */
          font-size: 16px;
          line-height: 22px;
          font-family: sans;
        }
        html, body {
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
      </style>
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
    `;
    loader.id = 'grist-static-loader';
    document.body.appendChild(loader);
    // Remove this loader once gristdoc is shown.
    const observer = new MutationObserver(() => {
      if (document.querySelector('.test-gristdoc')) {
        loader.remove();
        observer.disconnect();
      }
    });
    observer.observe(document.body, {childList: true});
  }
}
