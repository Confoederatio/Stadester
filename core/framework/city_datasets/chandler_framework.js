//Initialise functions
{
  global.loadChandlerModelskiCSV = function (arg0_input_file_path) {
    //Convert from parameters
    var input_file_path = arg0_input_file_path;

    //Declare local instance variables
    var csv_array = loadCSVAsArray(input_file_path);
    var csv_header = csv_array[0];
    var return_obj = {};

    //Iterate over csv_array
    for (var i = 1; i < csv_array.length; i++)
      if (csv_array[i][0]) {
        var local_city_key = csv_array[i][0].trim();

        if (!return_obj[local_city_key])
          return_obj[local_city_key] = {
            population: {}
          };
        var local_city_obj = return_obj[local_city_key];

        //Iterate over all local csv columns
        for (var x = 0; x < csv_array[i].length; x++) {
          var local_key = csv_header[x].toLowerCase();
          var local_value = csv_array[i][x];

          if (local_value != "")
            if (local_key == "city") {
              local_city_obj.city = local_value.trim();
            } else if (local_key == "othername") {
              local_city_obj.other_names = local_value.split(",");
            } else if (local_key == "country") {
              local_city_obj.country = local_value;
            } else if (local_key == "latitude") {
              local_city_obj.latitude = parseFloat(local_value);
            } else if (local_key == "longitude") {
              local_city_obj.longitude = parseFloat(local_value);
            } else if (local_key == "certainty") {
              local_city_obj.certainty = parseInt(local_value);
            } else if (local_key.startsWith("bc_")) {
              var local_year = parseInt(local_key.replace("bc_", ""))*-1;
              local_city_obj.population[local_year] = parseInt(local_value);
            } else if (local_key.startsWith("ad_")) {
              var local_year = parseInt(local_key.replace("ad_", ""));
              local_city_obj.population[local_year] = parseInt(local_value);
            }
        }
      }

    //Return statement
    return return_obj;
  };

  global.loadChandlerModelskiCSVs = function () {
    //Declare local instance variables
    var common_defines = config.defines.common;
    
    var all_chandler_modelski_csvs = Object.keys(common_defines.input_file_paths.chandler_modelski_csvs);

    //Iterate over all chandler_modelski_csvs
    for (var i = 0; i < all_chandler_modelski_csvs.length; i++) {
      var local_file_path = common_defines.input_file_paths.chandler_modelski_csvs[all_chandler_modelski_csvs[i]];
      
      main.population[all_chandler_modelski_csvs[i]] = loadChandlerModelskiCSV(local_file_path);
    }

    //Define main.population.chandler_modelski as merger of all datasets post intra-domain cubic spline interpolation
    main.population.chandler_modelski = {};
    var chandler_modelski_obj = main.population.chandler_modelski;

    //Iterate over all chandler_modelski_csvs
    for (var i = 0; i < all_chandler_modelski_csvs.length; i++) {
      var local_population_obj = main.population[all_chandler_modelski_csvs[i]];

      var all_cities = Object.keys(local_population_obj);

      //Iterate over all_cities
      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_population_obj[all_cities[x]];

        if (!chandler_modelski_obj[all_cities[x]]) {
          chandler_modelski_obj[all_cities[x]] = local_city;
        } else {
          var merged_city_obj = chandler_modelski_obj[all_cities[x]];

          //Iterate over local_city.population keys
          var all_population_keys = Object.keys(local_city.population);

          for (var y = 0; y < all_population_keys.length; y++) {
            var local_population_value = local_city.population[all_population_keys[y]];

            //If there is no value for this year, set it; otherwise, push it to an array value
            if (!merged_city_obj.population[all_population_keys[y]]) {
              merged_city_obj.population[all_population_keys[y]] = local_population_value;
            } else {
              var local_merged_value = merged_city_obj.population[all_population_keys[y]];

              if (!Array.isArray(local_merged_value))
                merged_city_obj.population[all_population_keys[y]] = [local_merged_value];
              merged_city_obj.population[all_population_keys[y]].push(local_population_value);
            }
          }
        }
      }
    }

    //Iterate over all chandler_modelski cities and take the geomean of any population arrays
    var all_chandler_modelski_cities = Object.keys(main.population.chandler_modelski);

    for (var i = 0; i < all_chandler_modelski_cities.length; i++) {
      var local_city = main.population.chandler_modelski[all_chandler_modelski_cities[i]];

      var all_population_keys = Object.keys(local_city.population);
      
      //Iterate over all_population_keys
      for (var x = 0; x < all_population_keys.length; x++) {
        var local_value = local_city.population[all_population_keys[x]];

        if (Array.isArray(local_value))
          local_city.population[all_population_keys[x]] = weightedGeometricMean(local_value);
      }
    }
  };
}
