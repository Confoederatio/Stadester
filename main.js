//Error handling
process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', function (reason, p) {
    console.error('Unhandled Rejection:', reason);
});

//File directories to load into Eoscala
global.load_order = {
  load_directories: [
    "common",
    "core",
    "UF"
  ],
  load_files: []
};

//Import Core Framework
global.FileManager = require("./core/file_manager");

//Node.js imports
//Non-CommonJS imports
async function loadH5Wasm() {
    var h5wasm = await import('h5wasm');
    global.h5wasm = h5wasm.default; //Assign import to the global namespace
}
loadH5Wasm();

//CommonJS imports
global.cubic_spline = require("cubic-spline");
global.fs = require("fs");
global.JSDOM = require("jsdom").JSDOM;
global.mathjs = require("mathjs");
global.ml_matrix = require("ml-matrix");
global.netcdfjs = require("netcdfjs");
global.readline = require("readline");
global.papaparse = require("papaparse");
global.path = require("path");
global.pngjs = require("pngjs");
global.puppeteer = require("puppeteer-core");
global.tensorflow = require("@tensorflow/tfjs");
global.v8 = require("v8");

global.AdBlockerPlugin = require("puppeteer-extra-plugin-adblocker");
global.firefox = require("selenium-webdriver/firefox");
global.sync_request = require("sync-request");
global.url = require("url");
global.puppeteer = require("puppeteer-extra");
global.StealthPlugin = require("puppeteer-extra-plugin-stealth");

//Load all scripts
FileManager.loadAllScripts();
FileManager.loadFile("settings.js");

//Global CLI handling
{
  function clearRequireCache () {
      console.log("Reloading project files...");
      Object.keys(require.cache).forEach((key) => {
          delete require.cache[key];
      });
  }

  function splitCommandLine (arg0_input) {
    //Convert from parameters
    var input = arg0_input;

    //Declare local instance variables
    var args = [];
    var current_arg = "";
    var in_quotes = false;

    //Iterate over input tokens
    for (var i = 0; i < input.length; i++) {
      if (input[i] == '"') {
        in_quotes = (!in_quotes);
      } else if (input[i] == " " && !in_quotes) {
        if (current_arg.length > 0) {
          args.push(current_arg);
          current_arg = "";
        }
      } else {
        current_arg += input[i];
      }
    }

    //Push to args if possible
    if (current_arg.length > 0)
      args.push(current_arg);

    //Return statement
    return args;
  }

  function reloadDependencies () {
    //Call FileManager to re-evaluate all scripts. This should force function-based redefinitions.
    FileManager.loadAllScripts();
  }
}

//CLI handling
{
  //Set up global.prefix
  global.prefix = config.defines.common.prefix;

  //Set up global.cli. This must be defined outside a function.
  global.cli = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
  });
  //Log init settings
  console.log(`[${prefix}] ${config.defines.common.startup_message}`);
  console.log(`[${prefix}] Initialised with:`);
  console.log(`[${prefix}] - RAM allocation: ${v8.getHeapStatistics().heap_size_limit/1024/1024} MB`);

  function handleCLI () {
    //Run Scriptly-CLI frame
    cli.question(`[${prefix}] > `, (input_string) => {
        if (input_string.toLowerCase() === "exit") {
          console.log(`Exiting ${prefix}.`);

          //Break CLI
          cli.close();
        } else if (input_string.toLowerCase() === "reload") {
          reloadDependencies();
          handleCLI();
        } else {
          var args = splitCommandLine(input_string);

          if (args.length > 0) {
            //Handle command line
            handleCommandLine(args);
          }

          //KEEP AT BOTTOM!
          handleCLI(); //Refresh CLI loop
        }
    });
  }
}

//Start CLI; call startup()
handleCLI();
startup();