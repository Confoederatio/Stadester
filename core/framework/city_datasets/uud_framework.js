//Initialise functions
{
  global.linkChandlerModelskiCities = function () {
    //Declare local instance variables
    var all_chandler_modelski_cities = Object.keys(main.population.chandler_modelski);
    var uud_obj = JSON.parse(JSON.stringify(main.population.populstat));

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

        //Check if .latitude and .longitude are within 1 degree of .coords
        var latlng = local_uud_city.coords;
        var ot_latlng = [local_city.latitude, local_city.longitude];

        //Only find cities that are within 1 degree of .coords
        if (local_uud_city)
          if (Math.abs(latlng[0] - ot_latlng[0]) <= 1 && Math.abs(latlng[1] - ot_latlng[1]) <= 1) {
            local_uud_city.break_condition = [local_city_names[x], true];
            local_uud_city.latlng = latlng;
            local_uud_city.ot_latlng = ot_latlng;
            break;
          }
        //Reset local_uud_city for next iteration
        local_uud_city = undefined;
      } catch (e) {
        console.error(e);
      }

      if (local_uud_city) {
        local_uud_city.type = "populstat";
        local_uud_city.latitude = local_city.latitude;
        local_uud_city.longitude = local_city.longitude;
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

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];
        
        if (!local_city.type) 
          local_city.type = "populstat";
      }
    }

    //Return statement
    return uud_obj;
  }

  global.saveUUDData = function () {
    //Declare local instance variables
    var uud_obj = linkChandlerModelskiCities();

    //Save uud_obj
    FileManager.saveFileAsJSON(config.defines.common.input_file_paths.uud_cities, uud_obj);
  }
}
