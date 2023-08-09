(function(exports) {
  // Guess at where Grist assets live.
  const settings = window.gristOverrides = {};
  const bootstrapGristSource = document.currentScript?.src;
  const bootstrapGristPrefix = bootstrapGristSource ? new URL('..', bootstrapGristSource).href : '';
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
    const root = options.root ?? document.body;
    const seedFile = options.initialFile;
    const homeUrl = new URL('.', bootstrapGristLocation).href;
    settings.staticGristOptions = options;
    if (seedFile) {
      settings.seedFile = new URL(seedFile, bootstrapGristLocation);
    }
    if (options.initialData) {
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
      "homeUrl": homeUrl,
      "org": "docs",
      "baseDomain": null,
      "singleOrg": null,
      "helpCenterUrl": "https://support.getgrist.com",
      "pathOnly": true,
      "supportAnon": false,
      "supportEngines": null,
      "hideUiElements": ["helpCenter", "billing", "templates", "multiSite", "multiAccounts"],
      "pageTitleSuffix": null,
      "pluginUrl": "http://plugins.invalid",
      "stripeAPIKey": null,
      "googleClientId": null,
      "googleDriveScope": null,
      "helpScoutBeaconId": null,
      "maxUploadSizeImport": null,
      "maxUploadSizeAttachment": null,
      "timestampMs": 1678573297305,
      "enableWidgetRepository": true,
      "survey": false,
      "tagManagerId": null,
      "activation": {"isManager": false},
      "enableCustomCss": false,
      "supportedLngs": ["de", "en", "es", "fr", "nb_NO", "pt_BR"],
      "namespaces": ["client", "server"],
      "featureComments": false,
      "supportEmail": "support@getgrist.com",
      "assignmentId": "new~2d6rcxHotohxAuTxttFRzU",
      "plugins": []
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
      root.appendChild(asset);
    }
    for (const src of js) {
      const asset = document.createElement('script');
      asset.setAttribute('crossorigin', 'anonymous');
      asset.setAttribute('src', prefix + src);
      asset.async = false;
      root.appendChild(asset);
    }
  }

  // Now build the custom element.
  class GristViewer extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({mode: 'open'});
    }
    connectedCallback() {
      if (this.initiated) { return; }
      this.initiated = true;
      const initialFile = this.getAttribute('initial-file') || undefined;
      const name = this.getAttribute('name') || "";
      const initialData = this.getAttribute('initial-data') || undefined;
      const singlePage = this.hasAttribute('single-page');
      bootstrapGrist({
        element: this.shadow,
        initialFile,
        name,
        initialData,
        singlePage
      });
    }
  }

  // Make it block element by default. This style is prepended to the head, so it can be easily overridden.
  const defaultStyle = document.createElement('style');
  defaultStyle.textContent = `
    grist-viewer {
      display: block;
    }
  `;
  document.head.prepend(defaultStyle)
  customElements.define('grist-viewer', GristViewer);

  // Now make the link element. User will be able to just use it as <a is="grist-link" href="csv or grist file url" />
  // It will open this link in a popup with the viewer initiated.
  class GristAnchor extends HTMLAnchorElement {
    constructor() {
      super();
      useClick(this);
    }
  }
  customElements.define('grist-link', GristAnchor, {extends: 'a'});

  class GristButton extends HTMLButtonElement {
    constructor() {
      super();
      useClick(this);
    }
  }
  customElements.define('grist-button', GristButton, {extends: 'button'});
  const buttonStyle = document.createElement('style');
  buttonStyle.textContent = `
    button.grist, button.grist-large {
      outline: none;
      user-select: none;
      letter-spacing: -0.08px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Liberation Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      color: white;
      background: #16b378;
      border: #16b378;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }
    button.grist:hover, button.grist-large:hover {
      background: #009058;
      border: #009058;
    }
    button.grist-large {
      font-weight: bold;
      padding: 8px 16px;
      min-height: 40px;
    }
  `;
  document.head.prepend(buttonStyle)

  function useClick(el) {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      const name = el.getAttribute('name');
      const singlePage = el.hasAttribute('single-page');
      // Allow all settings for the URL in that order. Href accepts both format and is easier to use.
      const href = el.getAttribute('initial-file') || el.getAttribute('initial-data') || el.getAttribute('href');
      const initAttribute = el.getAttribute('initial-file') ? 'initial-file' :
                            el.getAttribute('initial-data') ? 'initial-data' :
                            href.endsWith('.csv') ? 'initial-data' : 'initial-file';
      const popup = document.createElement('div');

      // Now build popup.
      popup.style.position = 'absolute';
      popup.style.top = '0';
      popup.style.left = '0';
      popup.style.right = '0';
      popup.style.bottom = '0';
      popup.style.zIndex = '1000';
      popup.style.padding = '60px';
      popup.style.backgroundColor = /* little black overlay */ 'rgba(0,0,0,0.5)';
      const closeButton = document.createElement('button');
      closeButton.style.position = 'absolute';
      closeButton.style.top = '28px';
      closeButton.style.right = '28px';
      closeButton.style.width = '24px';
      closeButton.style.height = '24px';
      closeButton.style.padding = '0';
      closeButton.style.margin = '0';
      closeButton.style.border = 'none';
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.cursor = 'pointer';
      closeButton.appendChild(IconClose());
      closeButton.addEventListener('click', () => {
        document.body.removeChild(popup);
      });
      popup.innerHTML = `
        <grist-viewer ${initAttribute}="${href}" name="${name}" style="height: 100%" ${singlePage ? 'single-page' : ' '}></grist-viewer>
        <div style="
          font-size: 14px;
          text-align: center;
          font-family: monospace;
          color: white;
          margin-top: 8px;
        ">
          Powered by Grist. <a href="https://getgrist.com" style="color: #16b378 !important">Learn more</a>.
        </div>
    `;
      popup.appendChild(closeButton);
      document.body.appendChild(popup);
    });
  }


  function IconClose() {
    const svgElemetnWithX = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElemetnWithX.setAttribute('width', '24');
    svgElemetnWithX.setAttribute('height', '24');
    svgElemetnWithX.setAttribute('viewBox', '0 0 24 24');
    svgElemetnWithX.setAttribute('fill', 'none');
    svgElemetnWithX.setAttribute('stroke', 'white');
    svgElemetnWithX.setAttribute('stroke-width', '2');
    svgElemetnWithX.setAttribute('stroke-linecap', 'round');
    svgElemetnWithX.setAttribute('stroke-linejoin', 'round');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
    svgElemetnWithX.appendChild(path);
    return svgElemetnWithX;
  }
  exports.bootstrapGrist = bootstrapGrist;
})(window);
