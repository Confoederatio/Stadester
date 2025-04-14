//Initialise functions
{
  global.startup = function () {
    //Initialise main with cities
    global.main = {};
      global.main.browser_instances = {};
      global.main.cities = {}; //Contains final Stadestér data
      global.main.population = {}; //Contains city population data
    
    //Load .csv datasets
    loadChandlerModelskiCSVs();

    //Apply manual fixes to population datasets
    fixChandlerModelskiPopulations();

    //[WIP] - Debugging
    printErroneousChandlerModelskiPopulations();
  };
} 