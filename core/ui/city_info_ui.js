//Initialise functions
{
  global.printAllChandlerModelskiCityPopulations = function () {
    //Declare local instance variables
    var all_chandler_modelski_cities = Object.keys(main.population.chandler_modelski);

    //Iterate over all_chandler_modelski_cities
    for (var i = 0; i < all_chandler_modelski_cities.length; i++) {
      var local_city = main.population.chandler_modelski[all_chandler_modelski_cities[i]];

      console.log(local_city.name, `(${local_city.latitude}, ${local_city.longitude})`);

      var all_population_keys = Object.keys(local_city.population);
      var population_string = [];

      //Iterate over all_population_keys
      for (var x = 0; x < all_population_keys.length; x++) {
        var local_population_value = local_city.population[all_population_keys[x]];
        
        population_string.push(`${all_population_keys[x]}: ${local_population_value}`);
      }

      console.log(`- ${population_string.join(", ")}`);
    }
  };

  global.printCityCoords = function (arg0_city_name) {
    //Convert from parameters
    var city_name = arg0_city_name;

    //Send a CURL request to city_coords_framework
    getCityCoords(city_name).then((coords) => {
      console.log(coords);
    });
  };

  global.printErroneousChandlerModelskiPopulations = function () {
    //Declare local instance variables
    var all_chandler_modelski_cities = Object.keys(main.population.chandler_modelski);

    //Iterate over all_chandler_modelski_cities
    for (var i = 0; i < all_chandler_modelski_cities.length; i++) {
      var local_city = main.population.chandler_modelski[all_chandler_modelski_cities[i]];

      var all_population_keys = Object.keys(local_city.population);

      //Iterate over all_population_keys; check if local_population_value has >50% annual growth, or <50% annual growth; flat (not compounding) between intervals
      if (all_population_keys.length > 1)
        if (!config.chandler_modelski.errors.whitelisted_cities.includes(all_chandler_modelski_cities[i]))
          for (var x = 1; x < all_population_keys.length; x++) {
            var left_year = parseInt(all_population_keys[x - 1]);
            var right_year = parseInt(all_population_keys[x]);

            var local_left_value = local_city.population[left_year];
            var local_right_value = local_city.population[right_year];

            var local_growth_rate = ((local_right_value - local_left_value)/(right_year - left_year))/local_left_value;

            if (local_growth_rate >= 0.25 || local_growth_rate <= -0.25)
              console.log(`${all_chandler_modelski_cities[i]} ${left_year} - ${right_year}, (${right_year - left_year} years): ${local_growth_rate}`, local_right_value - local_left_value);
          }
    }
  };
}