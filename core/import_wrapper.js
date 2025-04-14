//Import Blob
(async () => {
  try {
    const { Blob } = await import('fetch-blob');
    const { Builder, By, until } = require("selenium-webdriver");
    const fetchModule = await import('node-fetch');
    const { exec } = require("child_process");

    global.Blob = Blob;
    global.Builder = Builder;
    global.By = By;
    global.exec = exec;
    global.fetch = fetchModule.default;
    global.Headers = fetchModule.Headers;
    global.Request = fetchModule.Request;
    global.Response = fetchModule.Response;
    global.until = until;

    global.fs_promises = fs.promises;
  } catch (e) {}
})();
