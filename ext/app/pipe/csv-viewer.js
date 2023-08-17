// This file is replaced by the build process with the actual content of those two files.
// Here it is only for easier development.
(function(){
  const url = new URL('.', document.currentScript.src).href;
  document.write(`
    <script src="${url}bootstrap.js"></script>
    <script src="${url}components.js"></script>
  `)
})();
