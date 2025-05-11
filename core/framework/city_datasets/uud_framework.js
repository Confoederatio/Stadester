//Initialise functions
{
  function linkChandlerModelskiCities () {
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

        if (local_uud_city) break;
      } catch (e) {}

      if (local_uud_city) {
        local_uud_city.chandler_modelski_key = all_chandler_modelski_cities[i];
        local_uud_city.chandler_modelski_population = local_city.population;
      } else {
        //Set local_city as a new UUD city
        uud_obj[all_chandler_modelski_cities[i]] = local_city;
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
