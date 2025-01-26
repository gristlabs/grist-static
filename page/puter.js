// Seems to be an exposed polyfill of node's "path" module. Let's use it.
const path = puter.path;

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
let _puterFSItem = null;
let _isSaved = false;
function setCurrentPuterFSItem(item, isSaved) { _puterFSItem = item; _isSaved = isSaved; }
function getCurrentDocName() { return getNameFromFSItem(_puterFSItem)?.name; }

// Called when a document gets changed.
function onChange() {
  markAsSaved(false);
}

function markAsSaved(isSaved) {
  _isSaved = isSaved;
  const dpm = window.gristDocPageModel;
  // This is hack: isFork determines the logic for whether the document shows as
  // "unsaved", and isBareFork causes the save button to be named "Save Document".
  dpm.currentDoc.set({...dpm.currentDoc.get(), isFork: !isSaved, isBareFork: !isSaved});
}

// Saves a new or existing document. Collects its contents and name, and uses puter's save-file
// dialog for an unsaved document, or writes over an existing one.
async function save() {
  const homeUrl = gristConfig.homeUrl;
  const docId = gristOverrides.fakeDocId;
  const downloadUrl = new URL(`api/docs/${docId}/download`, homeUrl).href;
  const downloadInfo = await fetchDownloadContent(downloadUrl);
  if (_puterFSItem) {
    const data = new Blob([downloadInfo.data]);
    await puter.fs.write(_puterFSItem.path, data);
    markAsSaved(true);
  } else {
    await puter.ui.showSaveFilePicker(downloadInfo.data, downloadInfo.name);
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
  getCurrentDocName,
  onChange,
  save,
  rename,
};

async function openGristWithItem(item) {
  try {
    const config = {name: 'Untitled document', behaviorOverrides};
    if (item) {
      const {name, ext} = getNameFromFSItem(item);
      config.name = name;
      if (['.csv', '.xlsx', '.tsv'].includes(ext.toLowerCase())) {
        // initialContent is used for imports.
        config.initialContent = await (await item.read()).text();
      } else if (ext.toLowerCase() === '.grist') {
        // initialFile is used for opening existing Grist docs.
        config.initialFile = await (await item.read()).bytes();
        setCurrentPuterFSItem(item, true);
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
        if (answer === 'save') { await save(); }
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
