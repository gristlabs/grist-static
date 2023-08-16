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
      const csvHref = href?.endsWith('.csv') ? href : undefined;
      const gristHref = href?.endsWith('.grist') ? href : undefined;
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
    if (!clickEvent.target.matches('[data-grist-csv-open],[data-grist-doc-open]')) {
      return;
    }
    clickEvent.preventDefault();
    previewInGristClickHandler(clickEvent.target);
  });


  function previewInGrist(options) {
    const popup = document.createElement('div');
    popup.id = 'grist-viewer-popup';
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.left = '0';
    popup.style.right = '0';
    popup.style.bottom = '0';
    popup.style.zIndex = '1000';
    popup.style.padding = '60px';
    popup.style.backgroundColor = /* little black overlay */ 'rgba(0,0,0,0.5)';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    const href = options.initialFile || options.initialData || options.initialContent;
    console.assert(href, 'Must provide initialFile, initialData or initialContent');
    const initAttribute = options.initialFile ? 'initial-file' : options.initialData ? 'initial-data' : 'initial-content';
    const {name, singlePage} = options;
    const loader = options.loader === false ? '' : 'loader';
    popup.innerHTML = `
      <csv-viewer ${initAttribute}="${href}" name="${name}" ${loader} style="flex: 1" ${singlePage ? 'single-page' : ' '}></csv-viewer>
      <div style="
        font-size: 14px;
        text-align: center;
        font-family: monospace;
        color: white;
        margin-top: 8px;
      ">
        Powered by Grist. <a href="https://getgrist.com" style="color: #16b378">Learn more</a>.
      </div>
      <button style="position: absolute; top: 28px; right: 28px; width: 24px; height: 24px; padding: 0; margin: 0; border: none; background-color: transparent; cursor: pointer;">
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
    popup.querySelector('button').addEventListener('click', () => popup.remove());

    // Remove any existing popup.
    document.querySelectorAll('#grist-viewer-popup').forEach((el) => el.remove());

    // Add the popup to the end of the body.
    document.body.appendChild(popup);
  }

  function previewInGristClickHandler(refElement) {
    // Read all the settings from the element.
    const name = refElement.getAttribute('data-name');
    const singlePage = refElement.hasAttribute('data-single-page');
    // Allow all settings for the URL in that order. Href accepts both format and is easier to use.
    const href =
      refElement.getAttribute('href') ||
      refElement.getAttribute('data-initial-file') || refElement.getAttribute('data-grist-doc-open') ||
      refElement.getAttribute('data-initial-data') || refElement.getAttribute('data-grist-csv-open');

    const hasExtension = href.toLowerCase().endsWith('.csv') || href.toLowerCase().endsWith('.grist');
    let initAttribute = null;
    if (hasExtension) {
      initAttribute = href.toLowerCase().endsWith('.csv') ? 'initialData' : 'initialFile';
    } else {
      initAttribute = refElement.hasAttribute('data-initial-file') || refElement.hasAttribute('data-grist-doc-open') ? 'initialFile' :
                      refElement.hasAttribute('data-initial-data') || refElement.hasAttribute('data-grist-csv-open') ? 'initialData' :
                      null;
    }
    console.assert(initAttribute, 'Must provide initialFile, initialData or initialContent');

    // Loader is shown by default, needs an explicit false to disable.
    const loader = refElement.getAttribute('data-loader') === 'false' ? false : true;
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
  `);

  function style(content) {
    const styleElement = document.createElement('style');
    styleElement.textContent = content;
    document.head.appendChild(styleElement);
    return styleElement;
  }


  // ##################### CSV drop #####################


  class CsvDrop extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            font-family: sans-serif;
            display: block;
          }
          #drop-area-surround {
            border-radius: 24px;
            padding: 20px;
            width: 480px;
            margin: 50px auto;
            padding: 8px;
            background-color: #27d843;
          }
          #drop-area {
            border: 2px dashed #fff;
            border-radius: 16px;
            padding: 20px;
          }
          #drop-area.highlight {
            border: 2px solid yellow;
          }
          p {
            margin-top: 0;
          }
          .my-form {
            color: white;
            text-align: center;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: space-around;
            align-items: center;
            width: 100%;
          }
          #gallery {
            margin-top: 10px;
            display: none;
          }
          #gallery img {
            width: 150px;
            margin-bottom: 10px;
            margin-right: 10px;
            vertical-align: middle;
          }
          .button {
            display: inline-block;
            padding: 10px;
            color: black;
            background: #eee;
            cursor: pointer;
            border-radius: 5px;
            border: 1px solid #ccc;
          }
          .button:hover {
            background: #ddd;
          }
          #fileElem {
            display: none;
          }
        </style>
        <div id="drop-area-surround">
          <div id="drop-area">
            <form class="my-form">
              <div>
                Drag & Drop to<br />
                Upload File
              </div>

              <div>
                OR
              </div>

              <div>
                <input type="file" id="fileElem" accept=".csv" />
                <label class="button" for="fileElem">Browse File</label>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    connectedCallback() {
      const root = this.shadowRoot;
      function setupLoader(element, callback) {
        let dropArea = root.getElementById(element);
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
          dropArea.addEventListener(eventName, preventDefaults, false)
          document.body.addEventListener(eventName, preventDefaults, false)
        });
        ['dragenter', 'dragover'].forEach(eventName => {
          dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false)
        });
        ['dragleave', 'drop'].forEach(eventName => {
          dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false)
        });
        dropArea.addEventListener('drop', handleDrop, false)
        dropArea.querySelector('input[type=file]').addEventListener('change', function() {
          handleFiles(this.files);
          this.value = null;
        });
        function preventDefaults(e) {
          e.preventDefault();
          e.stopPropagation();
        }
        function handleDrop(e) {
          var dt = e.dataTransfer;
          var files = dt.files;
          handleFiles(files);
        }
        function handleFiles(files) {
          files = [...files];
          files.forEach(previewFile);
        }
        function previewFile(file) {
          let reader = new FileReader();
          reader.readAsText(file);
          reader.onloadend = function() {
            callback({
              txt: reader.result,
              name: file.name,
            });
          }
        }
      }
      const processAddition = (addition) => {
        const {txt, name} = addition;
        const event = new CustomEvent('file-changed', {
          detail : {
            data: txt,
            name,
          }
        });
        this.dispatchEvent(event);
      }
      setupLoader('drop-area', processAddition);
    }
  }

  customElements.define('csv-drop', CsvDrop);
})();