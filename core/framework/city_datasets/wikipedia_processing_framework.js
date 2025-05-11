//Initialise functions
{
  global.fixAllWikipediaOutliers = function (arg0_populstat_obj) {
    //Convert from parameters
    var populstat_obj = (arg0_populstat_obj) ? arg0_populstat_obj : main.population.populstat;

    //Declare local instance variables
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
        var local_population_domain = [];

        var has_wikipedia_population = false;

        //1. Cubic spline .population field if possible
        if (local_city.population) {
          var all_population_keys = Object.keys(local_city.population);

          local_city.population = cubicSplineInterpolationObject(local_city.population);
          local_city.population = operateObject(local_city.population, `n = n*1000`);

          local_population_domain = [
            parseInt(all_population_keys[0]), 
            parseInt(all_population_keys[all_population_keys.length - 1])
          ];
        }
        
        //1.1. See if wikipedia_population is present and needs fixing
        if (local_city.wikipedia_population)
          if (Object.keys(local_city.wikipedia_population).length > 0)
            has_wikipedia_population = true;
        if (!has_wikipedia_population) continue;

        //2. Fetch average deviation factor via closest point sampling
        //Remove .wikipedia_population's first element if it is within 2% of the present population
        var all_wikipedia_population_keys = Object.keys(local_city.wikipedia_population);

        if (all_wikipedia_population_keys.length >= 2) {
          var first_wikipedia_population = local_city.wikipedia_population[all_wikipedia_population_keys[0]];
          var last_wikipedia_population = local_city.wikipedia_population[all_wikipedia_population_keys[all_wikipedia_population_keys.length - 1]];

          if (Math.abs(first_wikipedia_population - local_city.population) < 0.02*local_city.population)
            delete local_city.wikipedia_population[all_wikipedia_population_keys[0]];
        }

        var wikipedia_population = JSON.parse(JSON.stringify(local_city.wikipedia_population));
        var tn_wikipedia_population = operateObject(JSON.parse(JSON.stringify(local_city.wikipedia_population)), `n = n/1000`);
        var mn_wikipedia_population = operateObject(JSON.parse(JSON.stringify(local_city.wikipedia_population)), `n = n/1000000`);

        var local_average_deviation = getAverageDeviationFromObject(wikipedia_population, local_city.population);
        var local_average_tn_deviation = getAverageDeviationFromObject(tn_wikipedia_population, local_city.population);
        var local_average_mn_deviation = getAverageDeviationFromObject(mn_wikipedia_population, local_city.population);

        var best_fit_dictionary = [
          ["vanilla", local_average_deviation, wikipedia_population],
          ["tn", local_average_tn_deviation, tn_wikipedia_population],
          ["mn", local_average_mn_deviation, mn_wikipedia_population]
        ];

        //Sort deviations in ascending order
        best_fit_dictionary.sort((a, b) => a[1] - b[1]);
        var best_fit_deviation = best_fit_dictionary[0][1];

        //Delete wikipedia_population if deviation exceeds twice the credible estimates
        if (best_fit_deviation < 0.5 || best_fit_deviation > 2) {
          delete local_city.wikipedia_population;
        } else {
          //Otherwise; update wikipedia_population and scale it by local_average_deviation to be compatible with Populstat
          local_city.wikipedia_population = operateObject(best_fit_dictionary[0][2], `n = n*${local_average_deviation}`);
          if (Object.keys(local_city.wikipedia_population).length >= 2)
            local_city.wikipedia_population = cubicSplineInterpolationObject(local_city.wikipedia_population);

          local_city.best_fit_dictionary = best_fit_dictionary;
        }
      }
    }

    //Return statement
    return populstat_obj;
  }
}