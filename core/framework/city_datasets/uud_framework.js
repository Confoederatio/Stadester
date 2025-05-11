//Initialise functions
{
  global.initialiseUUD = function (arg0_options) {
    //Convert from parameters
    var options = (arg0_options) ? arg0_options : {};

    //Declare local instance variables
    var all_chandler_modelski_cities = Object.keys(main.population.chandler_modelski);
    var uud_obj = JSON.parse(JSON.stringify(main.population.populstat));

    var all_countries = Object.keys(uud_obj);

    //1. Fix all Wikipedia outliers
    uud_obj = fixAllWikipediaOutliers(uud_obj);

    //2. Iterate over all_chandler_modelski_cities; link each one to a UUD city if possible
    for (var i = 0; i < all_chandler_modelski_cities.length; i++) {
      var local_city = main.population.chandler_modelski[all_chandler_modelski_cities[i]];
      var local_split_city_name = all_chandler_modelski_cities[i].split("-");

      var local_country_name = local_split_city_name[local_split_city_name.length - 1];
        local_split_city_name.pop();
        local_split_city_name = local_split_city_name.join("-");
      
      var local_city_names = [`${local_split_city_name}, ${local_country_name}`, local_split_city_name];

      if (local_city.other_names) {
        var local_other_names = getList(local_city.other_names);

        for (var x = 0; x < local_other_names.length; x++) {
          local_city_names.push(`${local_other_names[x]}, ${local_country_name}`);
          local_city_names.push(local_other_names[x]);
        }
      }

      //3. Iterate over local_city_names; find local_uud_city
      var local_uud_city;

      for (var x = 0; x < local_city_names.length; x++) try {
        local_uud_city = getPopulstatCity(local_city_names[x], { populstat_obj: uud_obj });

        //Only find cities that are within 1 degree of .coords
        if (local_uud_city) {
          //Check if .latitude and .longitude are within 1 degree of .coords
          var latlng = local_uud_city.coords;
          var ot_latlng = [local_city.latitude, local_city.longitude];

          if (Math.abs(latlng[0] - ot_latlng[0]) <= 1 && Math.abs(latlng[1] - ot_latlng[1]) <= 1) {
            if (options.debug) {
              local_uud_city.break_condition = [local_city_names[x], true];
              local_uud_city.latlng = latlng;
              local_uud_city.ot_latlng = ot_latlng;
            }
            break;
          }
        }

        //Reset local_uud_city for next iteration
        local_uud_city = undefined;
      } catch (e) {
        //console.log(local_city_names);
        console.error(e);
      }

      //Otherwise; check if there are any UUD cities whose .coords are within 0,1 degrees of ot_latlng; fetch closest match
      //Iterate over all_countries
      var closest_uud_city = [undefined, 1];

      if (!local_uud_city) {
        for (var x = 0; x < all_countries.length; x++) {
          var local_country = uud_obj[all_countries[x]];

          //Iterate over all_cities in country
          var all_cities = Object.keys(local_country);

          for (var y = 0; y < all_cities.length; y++) {
            var local_ot_city = local_country[all_cities[y]];

            if (local_ot_city.type) continue; //Skip if .type is already set; this is likely a Chandler-Modelski city

            var latlng = local_ot_city.coords;
            var ot_latlng = [local_city.latitude, local_city.longitude];

            if (latlng)
              if (Math.abs(latlng[0] - ot_latlng[0]) <= 0.1 && Math.abs(latlng[1] - ot_latlng[1]) <= 0.1) {
                var sum_distance = Math.abs(latlng[0] - ot_latlng[0]) + Math.abs(latlng[1] - ot_latlng[1]);

                if (sum_distance < closest_uud_city[1] && sum_distance < 0.2)
                  closest_uud_city = [local_country[all_cities[y]], sum_distance];
              }
          }
        }

        if (closest_uud_city[0])
          local_uud_city = closest_uud_city[0];
      }

      //Assign populstat/chandler_modelski city types
      if (local_uud_city) {
        local_uud_city.type = "populstat";
        local_uud_city.chandler_modelski_coords = [local_city.latitude, local_city.longitude];
        local_uud_city.chandler_modelski_key = all_chandler_modelski_cities[i];
        local_uud_city.chandler_modelski_population = local_city.population;
      } else {
        //Set local_city as a new UUD city
        local_city.type = "chandler_modelski";
        uud_obj[all_chandler_modelski_cities[i]] = local_city;
      }
    }

    //4. Set .type for all remaining UUD cities
    var all_countries = Object.keys(uud_obj);

    //Iterate over all_countries
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = uud_obj[all_countries[i]];

      if (local_country.type) continue; //Skip if .type is already set; this is likely a Chandler-Modelski city

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_uud_city = local_country[all_cities[x]];
        
        if (!local_uud_city.type) 
          local_uud_city.type = "populstat";
      }
    }

    //Return statement
    return uud_obj;
  };

  /**
   * processUUD() - Merges all UUD city data into having monolithic .population estimates
   * @param {*} arg0_uud_obj 
   */
  global.processUUD = function (arg0_uud_obj) { //[WIP] - Finish function body
    //Convert from parameters
    var uud_obj = arg0_uud_obj;

    //Declare local instance variables
    var all_countries = Object.keys(uud_obj);

    //1. Handle .type = "populstat" first
    //Iterate over all_countries
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = uud_obj[all_countries[i]];

      if (local_country.type) continue;

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_uud_city = local_country[all_cities[x]];

        //.population
        //2. Cubic interpolate intervening years for .population, but only if there are at least 2 extant data points
        if (local_uud_city.population) {
          var all_population_keys = Object.keys(local_uud_city.population);

          if (all_population_keys.length >= 2) {
            //Cubic interpolate intervening years
            var population_domain = [
              parseInt(all_population_keys[0]), 
              parseInt(all_population_keys[all_population_keys.length - 1])
            ];
            var population_years = [];

            //Fill in population_domain for all years
            for (var y = population_domain[0]; y <= population_domain[1]; y++)
              population_years.push(y);

            //Cubic interpolate intervening years
            local_uud_city.population = cubicSplineInterpolationObject(local_uud_city.population, { 
              years: population_years 
            });
          }
        }
        
        if (!local_uud_city.population) local_uud_city.population = {};

        //.wikipedia_population 
        if (local_uud_city.wikipedia_population) {
          var all_wikipedia_population_keys = Object.keys(local_uud_city.wikipedia_population);

          //3. Remove all duplicate integer entries from .wikipedia_population. Do not preserve any of the duplicate entries.
          local_uud_city.wikipedia_population = removeAllDuplicateValuesInObject(local_uud_city.wikipedia_population);

          //4. Cubic interpolate intervening years, but only if there are at least 2 extant data points
          if (all_wikipedia_population_keys.length >= 2) {
            //Cubic interpolate intervening years
            var wikipedia_population_domain = [
              parseInt(all_wikipedia_population_keys[0]), 
              parseInt(all_wikipedia_population_keys[all_wikipedia_population_keys.length - 1])
            ];

            var wikipedia_population_years = [];

            //Fill in wikipedia_population_domain for all years
            for (var y = wikipedia_population_domain[0]; y <= wikipedia_population_domain[1]; y++)
              wikipedia_population_years.push(y);

            //Cubic interpolate intervening years
            local_uud_city.wikipedia_population = cubicSplineInterpolationObject(local_uud_city.wikipedia_population, { 
              years: wikipedia_population_years 
            });
          }

          //5. Merge .wikipedia_population into .population using geometric mean where domains overlap
          all_wikipedia_population_keys = Object.keys(local_uud_city.wikipedia_population);

          //Iterate over all_wikipedia_population_keys
          for (var y = 0; y < all_wikipedia_population_keys.length; y++) {
            var local_population_value = local_uud_city.population[all_wikipedia_population_keys[y]];
            var local_wikipedia_value = local_uud_city.wikipedia_population[all_wikipedia_population_keys[y]];

            if (local_population_value && local_wikipedia_value) {
              local_uud_city.population[all_wikipedia_population_keys[y]] = weightedGeometricMean([local_population_value, local_wikipedia_value]);
            } else {
              local_uud_city.population[all_wikipedia_population_keys[y]] = local_wikipedia_value;
            }
          }
        }

        //6. Merge .chandler_modelski_population into .population (after cubic spline interpolation) using geometric mean where domains overlap

        //7. Fetch local_agglomeration_obj; subtract suburbs from .is_agglomeration_of figures for overlapping years where possible

        //8. Remove any zero or negative values from the main agglomeration if there is a main agglomeration
      }
    }

    //Return statement
    return uud_obj;
  };

  global.saveUUDData = function () {
    //Declare local instance variables
    var uud_obj = initialiseUUD();

    //Save uud_obj
    FileManager.saveFileAsJSON(config.defines.common.input_file_paths.uud_cities, uud_obj);
  };
}
