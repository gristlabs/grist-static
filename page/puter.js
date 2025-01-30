/**
 * puter.js
 * ========
 * This is an implementation of an integration of grist-static with puter.com.
 * For Puter API documentation, see https://docs.puter.com/.
 */

// Seems to be an exposed polyfill of node's "path" module. Let's use it.
const path = puter.path;

// Puter causes uncaught errors which Grist reports in a toast. Silence those.
window.addEventListener('error', (ev) => {
  if (ev.filename.startsWith('https://js.puter.com/')) {
    ev.stopImmediatePropagation();
  }
});

// If item is present, get its name and extension, e.g.
// {path: "/foo/bar.txt"} -> {name: "bar", ext: ".txt"}. If item isn't set, returns undefined.
function getNameFromFSItem(item) {
  if (!item) { return undefined; }
  const parts = path.parse(item.path);
  const name = (item.name && item.name !== 'undefined') ? item.name : parts.name;
  return {name, ext: parts.ext};
}

// Get currently logged in puter user, or null.
async function getCurrentUser() {
  if (!puter.auth.isSignedIn) { return null; }
  const user = await puter.auth.getUser();
  return {
    "id": 1,
    "email": user.username,
    "name": user.username,
    "ref": user.uuid,
    "picture": null,
  };
}

// If working with an existing file, we keep a reference to it, so that we can rename or update it.
let _puterFSItem = null;      // Only set for a .grist file
let _puterImportItem = null;  // Set for an imported file, e.g. a CSV.
let _isOpen = false;
let _isSaved = true;
function setCurrentPuterFSItem(item) { _puterFSItem = item; }
function setCurrentPuterImportItem(item) { _puterImportItem = item; }

function markAsSaved(isSaved) {
  _isSaved = isSaved;
  const dpm = window.gristDocPageModel;
  // This is hack: isFork determines the logic for whether the document shows as
  // "unsaved", and isBareFork causes the save button to be named "Save Document".
  // id is set to a corresponding behavior (with or without "new~" prefix.)
  const id = behaviorOverrides.getCurrentDocId();
  dpm.currentDoc.set({...dpm.currentDoc.get(), id, isFork: !isSaved, isBareFork: !isSaved});
}

// Saves a new or existing document. Collects its contents and name, and uses puter's save-file
// dialog for an unsaved document, or writes over an existing one.
async function save() {
  const homeUrl = gristConfig.homeUrl;
  const docId = gristOverrides.fakeDocId;
  let downloadUrl = new URL(`api/docs/${docId}/download`, homeUrl).href;
  let destinationItem = _puterFSItem;

  if (!_puterFSItem && _puterImportItem &&
    // We can do a decent job saving back CSVs (unlike say Excel files), so offer that option.
    path.extname(_puterImportItem.path).toLowerCase() === '.csv'
  ) {
    const answer = await puter.ui.alert(
      'Some features and data may be lost if saved in CSV format. ' +
      'To preserve the full document, save it in Grist format.', [
        {label: 'Save as CSV', value: 'csv', type: 'primary'},
        {label: 'Save as Grist file', value: 'grist'},
        {label: 'Cancel', value: 'cancel'},
      ]);
    if (answer === 'csv') {
      // We need to pick what to export. We'll export the same thing that's in the Share Menu's
      // "export as csv" option, i.e. the current widget.
      downloadUrl = window.gristDocPageModel.gristDoc.get().getCsvLink();
      destinationItem = _puterImportItem;
    } else if (answer === 'grist') {
      // Fall through to saving the document normally.
    } else {
      return 'cancel';
    }
  }

  const downloadInfo = await fetchDownloadContent(downloadUrl);
  if (destinationItem) {
    const data = new Blob([downloadInfo.data]);
    await puter.fs.write(destinationItem.path, data);
    markAsSaved(true);
  } else {
    const result = await puter.ui.showSaveFilePicker(downloadInfo.data, downloadInfo.name);
    if (result) {
      _puterFSItem = result;
      markAsSaved(true);
    }
  }
}

// Implement renaming via puter.
async function rename(newName) {
  // Note: _puterFSItem.rename() method exists too but fails (and isn't well-documented).
  // We need to keep the extension manually.
  if (!_puterFSItem) { throw new Error("No currently open file"); }
  const parts = path.parse(_puterFSItem.path);
  const newBase = newName + (parts.ext || '');
  const item = await puter.fs.rename(_puterFSItem.path, newBase);
  _puterFSItem.path = item.path;
}

// These are puter-specific behaviors that we hook into grist-static.
const behaviorOverrides = {
  getCurrentUser,
  getCurrentDocName() { return getNameFromFSItem(_puterFSItem)?.name; },
  // Hackily returning "new~" prefix determines DocPageModel's *initial* understanding if the doc
  // is unsaved. See also markAsSaved() below.
  getCurrentDocId() { return _isSaved ? "fakeDocId" : "new~fakeDocId"; },
  onOpenComplete() { _isOpen = true; },
  onChange() { if (_isOpen) { markAsSaved(false); } },
  save,
  rename,
};


// XXX There is a bug on puter where some files are not readable. But they become readable if you
// open them at least once via showOpenFilePicker(). So do that so that it's at least somewhat
// possible to open.
async function readItemHack(item) {
  try {
    return await item.read();
  } catch (e) {
    if (e.code !== 'subject_does_not_exist') {
      throw e;
    }
    const answer = await puter.ui.alert(`Failed to open: ${e.message}`, [
      {label: 'Open another way', value: 'open', type: 'primary'},
      {label: 'Cancel', value: 'cancel'},
    ]);
    if (answer !== 'open') {
      puter.exit();
      return;
    }
  }
  item = await puter.ui.showOpenFilePicker();
  return await item.read();
}

const supportedExtensions = ['.csv', '.xlsx', '.tsv', '.dsv', '.txt', '.xlsm', '.json'];

async function openGristWithItem(item) {
  try {
    const config = {name: 'Untitled document', behaviorOverrides};
    if (item) {
      const {name, ext} = getNameFromFSItem(item);
      config.name = name;
      if (ext.toLowerCase() === '.grist') {
        // initialFile is used for opening existing Grist docs.
        config.initialFile = new Uint8Array(await (await item.read()).arrayBuffer());
        setCurrentPuterFSItem(item);
      } else if (supportedExtensions.includes(ext.toLowerCase())) {
        // initialData is used for imports.
        const content = await readItemHack(item);
        const nameWithExt = name + ext.toLowerCase();
        config.initialData = new File([content], nameWithExt);
        setCurrentPuterImportItem(item);
      } else {
        throw new Error("Unrecognized file type");
      }
    }

    // Watch for attempts to close an unsaved file.
    puter.ui.onWindowClose(async function(){
      if (!_isSaved) {
        const answer = await puter.ui.alert(
          'You have unsaved changes. Do you want to save them before you exit?', [
            {label: 'Save', value: 'save', type: 'primary'},
            {label: "Don't Save", value: 'exit'},
            {label: 'Cancel', value: 'cancel'},
          ]);
        if (answer === 'cancel') { return; }
        if (answer === 'save' && (await save()) === 'cancel') { return; }
      }
      puter.exit();
    })
    bootstrapGrist(config);
  } catch (e) {
    await puter.ui.alert(`Can't open file: ${e.message}`);
    puter.exit();
  }
}

// TODO a loader would be very nice, since bootstraping takes a while.
if (puter.ui.wasLaunchedWithItems()) {
  puter.ui.onLaunchedWithItems(items => openGristWithItem(items[0]));
} else {
  openGristWithItem(null);
}
