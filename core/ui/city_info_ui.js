//Initialise functions
{
  global.printAllChandlerModelskiCityPopulations = function () {
    //Declare local instance variables
    var all_chandler_modelski_cities = Object.keys(main.population.chandler_modelski);

    //Iterate over all_chandler_modelski_cities
    for (var i = 0; i < all_chandler_modelski_cities.length; i++) {
      var local_city = main.population.chandler_modelski[all_chandler_modelski_cities[i]];

      console.log(local_city.city, `(${local_city.latitude}, ${local_city.longitude})`);

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
}