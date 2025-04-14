//Initialise functions
{
  /**
   * fixChandlerModelskiPopulations() - Applies manual fixes to Chandler-Modelski.
   */
  global.fixChandlerModelskiPopulations = function () {
    //Declare local instance variables
    var chandler_modelski_obj = main.population.chandler_modelski;

    //Set manual fixes; these are mostly clerical errors regarding accidental 0 entries or order of magnitude errors
    //Aleppo, Syria
    delete chandler_modelski_obj["Aleppo-Syria"].population["1300"]; //0 entry
    //Alexandria, Egypt
    chandler_modelski_obj["Alexandria-Egypt"].population["365"] = chandler_modelski_obj["Alexandria-Egypt"].population["361"]; //Alexandrian earthquake is on the wrong year
    delete chandler_modelski_obj["Alexandria-Egypt"].population["361"]; //361 entry
    //Algiers, Algeria
    chandler_modelski_obj["Algiers-Algiers"].population["1925"] = 222000; //10x error
    chandler_modelski_obj["Algiers-Algeria"] = chandler_modelski_obj["Algiers-Algiers"]; //Algiers is not a country
      chandler_modelski_obj["Algiers-Algeria"].country = "Algeria";
    delete chandler_modelski_obj["Algiers-Algiers"];
    //Augsburg, Germany
    chandler_modelski_obj["Augsburg-Germany"] = chandler_modelski_obj["Augsberg-Germany"]; //Fix name
      chandler_modelski_obj["Augsburg-Germany"].name = "Augsburg";
      chandler_modelski_obj["Augsburg-Germany"].other_names.push("Augsberg");
      delete chandler_modelski_obj["Augsberg-Germany"];
    //Birmingham, United States of America
    chandler_modelski_obj["Birmingham-United States of America"].population["1970"] = 300910; //Confused with Birmingham, United Kingdom
    //Delhi, India
    chandler_modelski_obj["Delhi-India"].population["1375"] = 200000; //10x error
    chandler_modelski_obj["Delhi-India"].population["1399"] = 25000; //Tamurlane sacking
    chandler_modelski_obj["Delhi-India"].population["1596"] = 80000; //10x error
    //Fez, Morocco
    chandler_modelski_obj["Fez-Morocco"].population["1800"] = 60000; //Weird noise drop
    //Goa, India
    delete chandler_modelski_obj["Goa-India"].population["1510"]; //Remove noise
    //Izmail, Ukraine
    chandler_modelski_obj["Izmail-Ukraine"] = chandler_modelski_obj["Izmail-Romania"]; //Izmail is in Ukraine, not Romania
      delete chandler_modelski_obj["Izmail-Romania"];
    //Lahore, Pakistan
    chandler_modelski_obj["Lahore-Pakistan"].population["1600"] = 200000; //Sack of Lahore wasn't that devastating
    chandler_modelski_obj["Lahore-Pakistan"].population["1622"] = 250000;
    chandler_modelski_obj["Lahore-Pakistan"].population["1627"] = 255000;chandler_modelski_obj["Lahore-Pakistan"].population["1631"] = 284000;
    //Nanjing, China
    chandler_modelski_obj["Nanjing-China"].population["1970"] = 2000000; //10x error
    chandler_modelski_obj["Nanjing-China"].population["2000"] = 5448900; //Demonstrably false
    //Palermo, Italy
    chandler_modelski_obj["Palermo-Italy"].population["1150"] = 125000; //1000x error
    //Philadelphia, United States of America
    chandler_modelski_obj["Philadelphia-United States of America"].population["1914"] = 1760000; //10x error
    //Skopje, Macedonia
    chandler_modelski_obj["Skopje-Macedonia"] = chandler_modelski_obj["Skopje-Serbia"]; //Skopje is in Macedonia, not Serbia
      delete chandler_modelski_obj["Skopje-Serbia"];
    //Srirangapatna, India
    chandler_modelski_obj["Srirangapatna-India"].population["1799"] = 38000; //This figure is too high
    chandler_modelski_obj["Srirangapatna-India"].population["1799"] = 50000; //This figure is too high
    //Tbilisi, Georgia
    delete chandler_modelski_obj["Tbilisi-Georgia"].population["1100"]; //Zero entry
    //Tokyo, Japan
    delete chandler_modelski_obj["Tokyo-Japan"].population["2000"]; //Erroneous entry
  };

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
        var temp_city_obj = {
          population: {}
        };

        //Iterate over all local csv columns
        for (var x = 0; x < csv_array[i].length; x++) {
          var local_key = csv_header[x].toLowerCase();
          var local_value = csv_array[i][x];

          if (local_value != "")
            if (local_key == "city") {
              temp_city_obj.name = local_value.trim();
            } else if (local_key == "othername") {
              temp_city_obj.other_names = local_value.split(",");
            } else if (local_key == "country") {
              temp_city_obj.country = local_value;
            } else if (local_key == "latitude") {
              temp_city_obj.latitude = parseFloat(local_value);
            } else if (local_key == "longitude") {
              temp_city_obj.longitude = parseFloat(local_value);
            } else if (local_key == "certainty") {
              temp_city_obj.certainty = parseInt(local_value);
            } else if (local_key.startsWith("bc_")) {
              var local_year = parseInt(local_key.replace("bc_", ""))*-1;
              temp_city_obj.population[local_year] = parseInt(local_value);
            } else if (local_key.startsWith("ad_")) {
              var local_year = parseInt(local_key.replace("ad_", ""));
              temp_city_obj.population[local_year] = parseInt(local_value);
            }
        }

        local_city_key = `${local_city_key}-${temp_city_obj.country}`;
        if (!return_obj[local_city_key])
         return_obj[local_city_key] = temp_city_obj;
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
