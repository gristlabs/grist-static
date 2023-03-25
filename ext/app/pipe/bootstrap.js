function bootstrapGrist(options) {
  if (!globalThis.setImmediate) {
    // make do
    globalThis.setImmediate = (fn) => setTimeout(fn, 0);
  }

  options = options || {};
  const seedFile = options.initialFile;
  const homeUrl = new URL('.', window.location.href).href;
  window.staticGristOptions = options;
  if (seedFile) {
    window.seedFile = new URL(seedFile, window.location.href);
  }
  const fakeDocId = "new~2d6rcxHotohxAuTxttFRzU";
  const fakeUrl = "https://example.com/o/docs/doc/new~2d6rcxHotohxAuTxttFRzU";
  window.fakeUrl = fakeUrl;
  window.fakeDocId = fakeDocId;
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
    "enableWidgetRepository":false,
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
  const prefix = '';
  for (const src of css) {
    const asset = document.createElement('link');
    asset.setAttribute('rel', 'stylesheet');
    asset.setAttribute('crossorigin', 'anonymous');
    // asset.setAttribute('async', '');
    asset.async = false;
    asset.setAttribute('href', prefix + src);
    document.body.appendChild(asset);
  }
  for (const src of js) {
    const asset = document.createElement('script');
    asset.setAttribute('crossorigin', 'anonymous');
    asset.setAttribute('src', prefix + src);
    //asset.setAttribute('async', '');
    asset.async = false;
    document.body.appendChild(asset);
  }
}
