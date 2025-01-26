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

// Saves an unsaved document: collects its contents and name, and uses puter's save-file dialog.
async function onSave() {
  const homeUrl = gristConfig.homeUrl;
  const docId = gristOverrides.fakeDocId;
  const downloadUrl = new URL(`api/docs/${docId}/download`, homeUrl).href;
  const downloadInfo = await fetchDownloadContent(downloadUrl);
  const result = await puter.ui.showSaveFilePicker(downloadInfo.data, downloadInfo.name);
}

// If working with an existing file, we keep a reference to it, so that we can rename or update it.
let _puterFSItem;
function setCurrentPuterFSItem(item) { _puterFSItem = window._puterFSItem = item; }
function getCurrentDocName() { console.warn("MOO"); return getNameFromFSItem(_puterFSItem)?.name; }

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
  onSave,
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
      } else {
        throw new Error("Unrecognized file type");
      }
      setCurrentPuterFSItem(item);
    }
    bootstrapGrist(config);
  } catch (e) {
    await puter.ui.alert(e.message);
    puter.exit();
  }
}

// TODO a loader would be very nice, since bootstraping takes a while.
if (puter.ui.wasLaunchedWithItems()) {
  puter.ui.onLaunchedWithItems(items => openGristWithItem(items[0]));
} else {
  openGristWithItem(null);
}
