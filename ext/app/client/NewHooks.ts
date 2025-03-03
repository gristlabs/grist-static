// This file implements certain hooks as if they are part of the Grist app.
// These may indeed belong in the app, but aren't there yet and can be hacked up from here.

import {dom} from 'grainjs';
import type {IHooksExtended} from 'app/client/HookStub';
import type {FileDialogOptions} from 'app/client/ui/FileDialog';

/**
 * Observes changes to parentElem until it acquires a child matching the given CSS selector. At
 * that point, callback is called with the matching child. If no such match, or if keepObserving
 * is true, will continue observing parentElem indefinitely (this may be expensive).
 */
export function waitForElem(parentElem: HTMLElement, selector: string, callback: (elem: HTMLElement) => void,
    options: {keepObserving?: boolean} = {}) {
  const elem1 = parentElem.querySelector<HTMLElement>(selector);
  if (elem1) {
    callback(elem1);
    if (!options.keepObserving) {
      return;
    }
  }
  const maybeDone = () => {
    const elem = parentElem.querySelector<HTMLElement>(selector);
    if (elem) {
      if (!options.keepObserving) {
        observer.disconnect();
      }
      callback(elem);
    }
  };
  const observer = new MutationObserver(maybeDone);
  observer.observe(parentElem, {childList: true, subtree: true});
}

function overrideSave(callback: () => void) {
  // Once we have the top header, watch it for clicks, to catch clicks on any "Save*" buttons.
  // (Note that this doesn't catch "Save" in the dropdown menu.)
  waitForElem(document.body, '.test-top-header', (topHeader) => {
    dom.onElem(topHeader, 'click', (ev: MouseEvent) => {
      const target = ev.target;
      if (target instanceof HTMLElement && target.matches('.test-tb-share-action')
        && target.textContent?.startsWith("Save")) {
        ev.stopPropagation();
        callback();
      }
    }, {useCapture: true});   // Hack to capture the event before normal handlers trigger.
  });
}

function overrideOpen(open: (options: FileDialogOptions) => Promise<FileList>) {
  dom.onMatchElem(document.body, '#file_dialog_input', 'click', async (ev: Event, elem: EventTarget) => {
    ev.stopImmediatePropagation();
    ev.preventDefault();
    // Trick open() function into seeing the file list returned from the 'open' callback.
    const fileInput = elem as HTMLInputElement;
    const options: FileDialogOptions = {multiple: fileInput.multiple, accept: fileInput.accept};
    fileInput.files = await open(options);
    elem.dispatchEvent(new Event('change'));
  }, {useCapture: true});
}

export function setupNewHooks(hooks: IHooksExtended) {
  if (hooks.save) {
    overrideSave(hooks.save);
  }
  if (hooks.open) {
    overrideOpen(hooks.open);
  }
  if (hooks.upload) {
    const upload = hooks.upload;

    // A version of XMLHttpRequest that allows setting some normally read-only fields:
    // status and requestText; and overrides send() method to use simulated uploads.
    class MyXMLHttpRequest extends XMLHttpRequest {
      private _myStatus: number|undefined;
      private _myRequestText: string|undefined;
      get status() { return this._myStatus ?? super.status; }
      set status(s) { this._myStatus = s; }
      get responseText() { return this._myRequestText ?? super.responseText; }
      set responseText(s) { this._myRequestText = s; }

      public send(body?: any): void {
        return ((body && body instanceof FormData) ?
          upload(this, body, super.send) :
          super.send(body));
      }
    }

    // Override XMLHttpRequest, so that we can simulate a successful response.
    window.XMLHttpRequest = MyXMLHttpRequest;
  }
}
