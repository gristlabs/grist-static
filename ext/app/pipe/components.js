(function() {

  // ##################### CSV VIEWER #####################

  // A custom webcomponent that can be used to embed a CSV or Grist file in a page.
  // For example <csv-viewer href="csv or grist file url"></csv-viewer>
  // Though the name is csv-viewer, it can also be used to view grist files, accepts all the parameters
  // from the bootstrapGrist function and a href attribute that will be used as initial-file if it ends with .grist
  // or initial-data if it ends with .csv
  style(`
    csv-viewer {
      display: block;
    }
  `);
  // Now build the custom element.
  class CsvViewer extends HTMLElement {
    constructor() {
      super();

    }
    connectedCallback() {
      if (this.initiated) {return;}
      this.initiated = true;
      // Also support the href attribute, which is easier to use.
      const href = this.getAttribute('href');
      const csvHref = href?.toLowerCase().endsWith('.csv') ? href : undefined;
      const gristHref = href?.toLowerCase().endsWith('.grist') ? href : undefined;
      const initialFile = this.getAttribute('initial-file') || gristHref;
      const name = this.getAttribute('name') || "";
      const initialData = this.getAttribute('initial-data') || csvHref;
      const initialContent = this.getAttribute('initial-content');
      const singlePage = this.hasAttribute('single-page');
      const loader = this.hasAttribute('loader');
      bootstrapGrist({
        element: this,
        name,
        initialFile,
        initialData,
        initialContent,
        singlePage,
        loader
      });
    }
  }
  customElements.define('csv-viewer', CsvViewer);


  // ##################### Open with Grist popup #####################

  // Adds a global click handler for elements that should open a Grist document in a popup.

  window.addEventListener('click', (clickEvent) => {
    const target = clickEvent.target?.closest?.('[data-grist-csv-open],[data-grist-doc-open]');
    if (!target) {return;}
    clickEvent.preventDefault();
    previewInGristClickHandler(target);
  });


  function previewInGrist(options) {
    const popup = document.createElement('div');
    popup.id = 'grist-viewer-popup';
    const href = options.initialFile || options.initialData || options.initialContent;
    console.assert(href, 'Must provide initialFile, initialData or initialContent');
    const initAttribute = options.initialFile ? 'initial-file' : options.initialData ? 'initial-data' : 'initial-content';
    const {name, singlePage} = options;

    const csvNode = document.createElement('csv-viewer');
    csvNode.setAttribute(initAttribute, href);
    csvNode.setAttribute('name', name);
    csvNode.setAttribute('style', 'flex: 1');
    if (options.loader !== false) {
      csvNode.setAttribute('loader', '');
    }
    if (singlePage) {
      csvNode.setAttribute('single-page', '');
    }
    popup.appendChild(csvNode);
    popup.innerHTML += `
      <div class="grist-powered-by">
        Powered by <a
          href="https://www.getgrist.com/?utm_source=grist-csv-viewer&utm_medium=grist-csv-viewer&utm_campaign=grist-csv-viewer"
          target="_blank">Grist</a>
      </div>
      <button class="grist-close-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
      <!-- Prevent scrolling of the page behind the popup. -->
      <style>
        html, body {
          overflow: hidden;
        }
      </style>
    `;
    popup.querySelector('.grist-close-button').addEventListener('click', () => popup.remove());

    // Remove any existing popup.
    document.querySelectorAll('#grist-viewer-popup').forEach((el) => el.remove());

    // Add the popup to the end of the body.
    document.body.appendChild(popup);
  }

  function previewInGristClickHandler(refElement) {
    // Read all the settings from the element.
    const name = refElement.getAttribute('data-name');
    // Allow all settings for the URL in that order. Href accepts both format and is easier to use.
    const href =
      (refElement.getAttribute('href') !== "#" ? refElement.getAttribute("href") : null) ||
      refElement.getAttribute('data-initial-file') || refElement.getAttribute('data-grist-doc-open') ||
      refElement.getAttribute('data-initial-data') || refElement.getAttribute('data-grist-csv-open');

    const hasExtension = href?.toLowerCase().endsWith('.csv') || href?.toLowerCase().endsWith('.grist');
    let initAttribute = null;
    if (hasExtension) {
      initAttribute = href?.toLowerCase().endsWith('.csv') ? 'initialData' : 'initialFile';
    } else {
      initAttribute = refElement.hasAttribute('data-initial-file') || refElement.hasAttribute('data-grist-doc-open') ? 'initialFile' :
                      refElement.hasAttribute('data-initial-data') || refElement.hasAttribute('data-grist-csv-open') ? 'initialData' :
                      null;
    }
    console.assert(initAttribute, 'Must provide initialFile, initialData or initialContent');

    // Loader is shown by default, needs an explicit false to disable.
    const loader = refElement.getAttribute('data-loader') === 'false' ? false : true;
    // singlePage is false if data-single-page is set to false.
    // Otherwise, it will be true if either data-grist-csv-open or data-single-page is present.
    // This is complicated, but single page is a much better default for CSV.
    const singlePage = refElement.getAttribute('data-single-page') === 'false' ? false :
          (refElement.hasAttribute('data-grist-csv-open') || refElement.hasAttribute('data-single-page'));
    previewInGrist({[initAttribute]: href, name, singlePage, loader});
  }

  window.previewInGrist = previewInGrist;


  // ##################### Default styles for buttons #####################


  style(`
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

    #grist-viewer-popup {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      padding: 48px;
      background-color: rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
    }
    #grist-viewer-popup iframe {
      border-radius: 6px;
      box-shadow: 1px 1px 6px 0px rgba(0, 0, 0, 0.5);
    }
    #grist-viewer-popup .grist-powered-by {
      position: absolute;
      bottom: 28px;
      left: 0px;
      width: 100%;
      line-height: 20px;
      font-size: 12px;
      color: #d9d9d9;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Liberation Sans, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;
    }
    #grist-viewer-popup a {
      color: #16b378;
      text-decoration: none;
    }
    #grist-viewer-popup .grist-close-button {
      position: absolute;
      top: 24px;
      right: 24px;
      width: 24px;
      height: 24px;
      padding: 0;
      margin: 0;
      border: none;
      background-color: transparent;
      cursor: pointer;
    }
  `);

  function style(content) {
    const styleElement = document.createElement('style');
    styleElement.textContent = content;
    document.head.appendChild(styleElement);
    return styleElement;
  }
})();
