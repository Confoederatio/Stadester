//Initialise functions
{
  function fixAllWikipediaOutliers () { //[WIP] - Finish function body
    //Declare local instance variables
    var populstat_obj = main.population.populstat;

    var all_countries = Object.keys(populstat_obj);

    //Iterate over all_countries
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
        if (!local_country_name) local_country_name = all_countries[i];
      
      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];

        var has_wikipedia_population = false;
        
        if (local_city.wikipedia_population)
          if (Object.keys(local_city.wikipedia_population).length > 0)
            has_wikipedia_population = true;

        //1. Cubic spline .population field if possible
        if (local_city.population) {

        }
        if (has_wikipedia_population) {

        }
      }
    }
  }
}