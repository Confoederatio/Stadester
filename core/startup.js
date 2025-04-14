//Initialise functions
{
  global.startup = function () {
    //Initialise main with cities
    global.main = {};
      global.main.browser_instances = {};
      global.main.cities = {}; //Contains final Stadestér data
      global.main.curl = {
        populstat: {}
      };
      global.main.population = {}; //Contains city population data
    
    //Load .csv datasets
    loadChandlerModelskiCSVs();

    //Load Populstat; Wikipedia
    try {
      global.main.curl.populstat = FileManager.loadFileAsJSON(config.defines.common.input_file_paths.populstat_cities);
    } catch (e) {
      console.error(e);
    }

    //Apply manual fixes to population datasets
    fixChandlerModelskiPopulations();

    //[WIP] - Debugging
    printErroneousChandlerModelskiPopulations();
  };
} 