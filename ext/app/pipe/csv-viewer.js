(function(exports) {
  const bootstrapGristSource = document.currentScript?.src;

  // Add a polyfill for custom elements extensions for Safari (Safari has custom components but not the is="" syntax).
  if (isSafari()) {
    const script = document.createElement('script');
    script.src = '//unpkg.com/@ungap/custom-elements/es.js';
    document.head.appendChild(script);
  }

   // Make it block element by default. This style is prepended to the head, so it can be easily overridden.
   let GristViewerStyle = document.createElement('style');
   GristViewerStyle.textContent = `
     grist-viewer {
       display: block;
     }
   `;
  // Now build the custom element.
  class GristViewer extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({mode: 'open'});
    }
    connectedCallback() {
      if (this.initiated) { return; }
      // Append the default style if it hasn't been appended yet.
      if (GristViewerStyle) {
        document.head.prepend(GristViewerStyle);
        GristViewerStyle = null;
      }
     
      this.initiated = true;
      const initialFile = this.getAttribute('initial-file') || undefined;
      const name = this.getAttribute('name') || "";
      const initialData = this.getAttribute('initial-data') || undefined;
      const singlePage = this.hasAttribute('single-page');
      loadBootstrap();
      bootstrapGrist({
        element: this.shadow,
        initialFile,
        name,
        initialData,
        singlePage
      });
    }
  }
  customElements.define('grist-viewer', GristViewer);

  // Now make the link element. User will be able to just use it as <a is="grist-link" href="csv or grist file url" />
  // It will open this link in a popup with the viewer initiated.
  class GristAnchor extends HTMLAnchorElement {
    constructor() {
      super();
      onClickOpenPopup(this);
    }
  }
  customElements.define('grist-link', GristAnchor, {extends: 'a'});

  let GristButtonStyle = document.createElement('style');
  GristButtonStyle.textContent = `
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

  class GristButton extends HTMLButtonElement {
    constructor() {
      super();
      onClickOpenPopup(this);
    }

    connectedCallback() {
      if (this.initiated) { return; }
      // Append the default style if it hasn't been appended yet.
      if (GristButtonStyle) {
        document.head.prepend(GristButtonStyle);
        GristButtonStyle = null;
      }
    }
  }
  customElements.define('grist-button', GristButton, {extends: 'button'});

  // Adds an event listener to the element that opens a popup with the viewer.
  function onClickOpenPopup(refElement) {
    refElement.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      loadBootstrap();
      const name = refElement.getAttribute('name');
      const singlePage = refElement.hasAttribute('single-page');
      // Allow all settings for the URL in that order. Href accepts both format and is easier to use.
      const href = refElement.getAttribute('initial-file') || refElement.getAttribute('initial-data') || refElement.getAttribute('href');
      const initAttribute = refElement.getAttribute('initial-file') ? 'initial-file' :
                            refElement.getAttribute('initial-data') ? 'initial-data' :
                            href.endsWith('.csv') ? 'initial-data' : 'initial-file';
      
      // Now build popup.
      const popup = document.createElement('div');
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

  function loadBootstrap() {
    if (!window.bootstrapGrist) {
      const script = document.createElement('script');
      script.async = false;
      script.src = new URL('latest.js', bootstrapGristSource).href;
      document.head.appendChild(script);
    }
  }

  // Creates a X icon used to close the popup.
  function IconClose() {
    const svgElementWithX = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElementWithX.setAttribute('width', '24');
    svgElementWithX.setAttribute('height', '24');
    svgElementWithX.setAttribute('viewBox', '0 0 24 24');
    svgElementWithX.setAttribute('fill', 'none');
    svgElementWithX.setAttribute('stroke', 'white');
    svgElementWithX.setAttribute('stroke-width', '2');
    svgElementWithX.setAttribute('stroke-linecap', 'round');
    svgElementWithX.setAttribute('stroke-linejoin', 'round');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
    svgElementWithX.appendChild(path);
    return svgElementWithX;
  }

  function isSafari() {
    // Detect Chrome
    const chromeAgent = userAgentString.indexOf("Chrome") > -1;
    // Detect Safari
    let safariAgent = userAgentString.indexOf("Safari") > -1;
          
    // Discard Safari since it also matches Chrome
    if (chromeAgent && safariAgent) {
        safariAgent = false;
    }
    return safariAgent;
  }
})(window);
