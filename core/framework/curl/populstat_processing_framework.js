//Initialise functions
{
  /**
   * getPopulstatCity() - Fetches a Populstat city object/combined key '<city>-<country>'.
   * @param {String} arg0_city_name 
   * @param {Object} [arg1_options]
   *  @param {boolean} [arg1_options.return_key] - If true, return the city key instead of the city object.
   * 
   * @returns {Object|String}
   */
  global.getPopulstatCity = function (arg0_city_name, arg1_options) {
    //Convert from parameters
    var city_name = arg0_city_name.toLowerCase().trim();
    var options = (arg1_options) ? arg1_options : {};

    //Declare local instance variables
    var city_exists = ["", false]; //[city_obj, city_exists];
    var populstat_obj = main.curl.populstat;
    var split_city_name = city_name.split(/,|-/);
    
    var all_countries = Object.keys(populstat_obj);
    var city_country = "";
    var country_dict = {};

    if (split_city_name.length > 1)
      city_country = split_city_name[split_city_name.length - 1].trim();
    split_city_name.pop();
    city_name = split_city_name.join("-");

    //1. Exact key match first
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
      var is_in_country = false;

      //Iterate over all split_city_name components
      for (var x = 0; x < split_city_name.length; x++)
        split_city_name[x] = split_city_name[x].trim();

      //Populate country_dict
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];

        country_dict[all_cities[x].toLowerCase().trim()] = all_cities[x];
        if (local_city.other_names)
          for (var y = 0; y < local_city.other_names.length; y++)
            country_dict[local_city.other_names[y].toLowerCase().trim()] = all_cities[x];
      }

      //Check for exact city_exists
      if (all_countries[i].toLowerCase().trim() == city_country)
        is_in_country = true;
      if (local_country_name.toLowerCase().trim() == city_country)
        is_in_country = true;

      if (is_in_country) 
        if (country_dict[city_name])
          //Return statement
          return (!options.return_key) ? 
            local_country[country_dict[city_name]] : `${city_name}-${local_country_name}`;
    }

    //2. Soft search next
    //Iterate over all_countries
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];
        var local_city_names = [local_city.name];
          if (local_city.other_names)
            local_city_names = local_city_names.concat(local_city.other_names);

        for (var y = 0; y < local_city_names.length; y++)
          if (local_city_names[y].toLowerCase().trim().indexOf(city_name) != -1)
            city_exists = [(!options.return_key) ? local_country[all_cities[x]] :
              `${all_cities[x]}-${local_country_name}`, true];
      }
    }

    //3. Soft search; exact country match
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
        if (!local_country_name) local_country_name = all_countries[i];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      if (split_city_name.length > 1 && city_country == local_country_name)
        for (var x = 0; x < all_cities.length; x++) {
          var local_city = local_country[all_cities[x]];
          var local_city_names = [local_city.name];
            if (local_city.other_names)
              local_city_names = local_city_names.concat(local_city.other_names);

          for (var y = 0; y < local_city_names.length; y++)
            if (local_city_names[y].toLowerCase().trim() == city_name)
              city_exists = [(!options.return_key) ? local_country[all_cities[x]] :
                `${all_cities[x]}-${local_country_name}`, true];
        }
    }

    //4. Hard search
    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
        if (!local_country_name) local_country_name = all_countries[i];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);
      var check_country = false;

      if (split_city_name.length > 1 && city_country == local_country_name) {
        check_country = true;
      } else if (split_city_name.length == 1) {
        check_country = true;
      }

      if (check_country)
        for (var x = 0; x < all_cities.length; x++) {
          var local_city = local_country[all_cities[x]];
          var local_city_names = [local_city.name];
            if (local_city.other_names)
              local_city_names = local_city_names.concat(local_city.other_names);
          
          for (var y = 0; y < local_city_names.length; y++)
            if (local_city_names[y].toLowerCase().trim() == city_name)
              city_exists = [(!options.return_key) ? local_country[all_cities[x]] :
                `${all_cities[x]}-${local_country_name}`, true];
        }
    }

    //Return statement
    return (city_exists[1]) ? city_exists[0] : undefined;
  };

  global.processPopulstatData = function () {
    //Declare local instance variables
    var agglomeration_pattern = main.config.populstat.processing.agglomeration_patterns;
    var populstat_obj = main.curl.populstat;

    //Iterate over all_countries
    var all_countries = Object.keys(populstat_obj);


  };
}