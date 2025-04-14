//Initialise functions
{
  /**
   * getPopulstatCity() - Fetches a Populstat city object/combined key '<city>-<country>'.
   * @param {String} arg0_city_name 
   * @param {*} arg1_options 
   */
  global.getPopulstatCity = function (arg0_city_name, arg1_options) {
    //Convert from parameters
    var city_name = arg0_city_name.toLowerCase().trim();
    var options = (arg1_options) ? arg1_options : {};

    //Declare local instance variables
    var city_exists = ["", false]; //[city_obj, city_exists];
    var populstat_obj = main.curl.populstat;
    
    var all_countries = Object.keys(populstat_obj);

    //1. Exact key match first

    //2. Soft search next
    //Iterate over all_countries
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];
      }
    }

    //3. Hard search
  };

  global.processPopulstatData = function () {
    //Declare local instance variables
    var agglomeration_pattern = main.config.populstat.processing.agglomeration_patterns;
    var populstat_obj = main.curl.populstat;

    //Iterate over all_countries
    var all_countries = Object.keys(populstat_obj);


  };
}