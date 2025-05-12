//Initialise functions
{
  /**
   * getPopulstatCity() - Fetches a Populstat city object/combined key '<city>-<country>'.
   * @param {String} arg0_city_name 
   * @param {Object} [arg1_options]
   *  @param {Object} [arg1_options.populstat_obj] - If provided, use this Populstat object instead of main.population.populstat.
   *  @param {boolean} [arg1_options.same_country=false] - If true, only search within the same country.
   *  @param {boolean} [arg1_options.return_key=false] - If true, return the city key instead of the city object.
   * 
   * @returns {Object|String}
   */
  global.getPopulstatCity = function (arg0_city_name, arg1_options) {
    //Convert from parameters
    var city_name = arg0_city_name.toLowerCase().trim();
    var options = (arg1_options) ? arg1_options : {};

    //Declare local instance variables
    var city_exists = ["", false]; //[city_obj, city_exists];
    var populstat_obj = (options.populstat_obj) ? 
      options.populstat_obj : 
        (main.population.populstat) ? 
          main.population.populstat : main.curl.populstat; //Double ternary; refactor later
    var split_city_name = city_name.split(/,|-/);
    
    var all_countries = Object.keys(populstat_obj);
    var city_country = "";
    var country_dict = {};

    if (split_city_name.length > 1) {
      city_country = split_city_name[split_city_name.length - 1].trim();
      split_city_name.pop();
    }
    city_name = split_city_name.join("-");

    //options.same_country handling
    if (options.same_country) {
      var country_key = getPopulstatCountry(city_country, { return_key: true });
      all_countries = [country_key];
    }

    //1. Exact key match first
    for (var i = 0; i < all_countries.length; i++) {
      let local_country = populstat_obj[all_countries[i]];
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
      if (local_country_name)
        if (local_country_name.toLowerCase().trim() == city_country)
          is_in_country = true;
      if (!city_country)
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
      let local_country = populstat_obj[all_countries[i]];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];
        var local_city_names = [local_city.name];
          if (local_city.other_names)
            local_city_names = local_city_names.concat(local_city.other_names);

        for (var y = 0; y < local_city_names.length; y++)
          if (local_city_names[y])
            if (local_city_names[y].toLowerCase().trim().indexOf(city_name) != -1)
              city_exists = [(!options.return_key) ? local_country[all_cities[x]] :
                `${all_cities[x]}-${local_country_name}`, true];
      }
    }

    //3. Soft search; exact country match
    for (var i = 0; i < all_countries.length; i++) {
      let local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
        if (!local_country_name) local_country_name = all_countries[i];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      if (split_city_name.length > 1 && (city_country == local_country_name || !city_country))
        for (var x = 0; x < all_cities.length; x++) {
          var local_city = local_country[all_cities[x]];
          var local_city_names = [local_city.name];
            if (local_city.other_names)
              local_city_names = local_city_names.concat(local_city.other_names);

          for (var y = 0; y < local_city_names.length; y++)
            if (local_city_names[y])
              if (local_city_names[y].toLowerCase().trim() == city_name)
                city_exists = [(!options.return_key) ? local_country[all_cities[x]] :
                  `${all_cities[x]}-${local_country_name}`, true];
        }
    }

    //4. Hard search
    for (var i = 0; i < all_countries.length; i++) {
      let local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
        if (!local_country_name) local_country_name = all_countries[i];

      //Iterate over all_cities
      var all_cities = Object.keys(local_country);
      var check_country = false;

      if (split_city_name.length > 1 && city_country == local_country_name) {
        check_country = true;
      } else if (split_city_name.length == 1 || !city_country) {
        check_country = true;
      }

      if (check_country)
        for (var x = 0; x < all_cities.length; x++) {
          var local_city = local_country[all_cities[x]];
          var local_city_names = [local_city.name];
            if (local_city.other_names)
              local_city_names = local_city_names.concat(local_city.other_names);
          
          for (var y = 0; y < local_city_names.length; y++)
            if (local_city_names[y])
              if (local_city_names[y].toLowerCase().trim() == city_name)
                city_exists = [(!options.return_key) ? local_country[all_cities[x]] :
                  `${all_cities[x]}-${local_country_name}`, true];
        }
    }

    //Return statement
    return (city_exists[1]) ? city_exists[0] : undefined;
  };

  /**
   * getPopulstatMetroObject() - Fetches a Populstat metro object/combined key '<city>-<country>'.
   * @param {String} arg0_city_name 
   * @param {Object} [arg1_options]
   *  
   *  @param {boolean} [arg1_options.return_key=false] - If true, return the city key instead of the city object.
   * 
   * @returns {Object|String}
   */
  global.getPopulstatMetroObject = function (arg0_city_name, arg1_options) {

  };

  /**
   * getPopulstatCountry() - Fetches a Populstat country object/key.
   * @param {String} arg0_country_name 
   * @param {Object} [arg1_options]
   *  @param {boolean} [arg1_options.return_key=false] - If true, return the country key instead of the country object.
   * 
   * @returns {Object|String}
   */
  global.getPopulstatCountry = function (arg0_country_name, arg1_options) {
    //Convert from parameters
    var country_name = arg0_country_name.toLowerCase().trim();
    var options = (arg1_options) ? arg1_options : {};

    //Declare local instance variables
    var all_countries = Object.keys(main.curl.populstat);
    var country_exists = ["", false]; //[country_obj, country_exists];
    var populstat_obj = (main.population.populstat) ? 
      main.population.populstat : main.curl.populstat;

    //Iterate over all_countries - key, hard search
    for (var i = 0; i < all_countries.length; i++)
      if (all_countries[i].toLowerCase().trim() == country_name) {
        country_exists = [(!options.return_key) ? populstat_obj[all_countries[i]] : all_countries[i], true];
        break;
      }

    //Iterate over all_countries - key, soft search
    for (var i = 0; i < all_countries.length; i++)
      if (all_countries[i].toLowerCase().trim().indexOf(country_name) != -1) {
        country_exists = [(!options.return_key) ? populstat_obj[all_countries[i]] : all_countries[i], true];
        break;
      }

    //Iterate over all_countries - string, hard search
    for (var i = 0; i < all_countries.length; i++)
      if (config.populstat.countries[all_countries[i]].toLowerCase().trim() == country_name) {
        country_exists = [(!options.return_key) ? populstat_obj[all_countries[i]] : all_countries[i], true];
        break;
      }

    //Iterate over all_countries - string, soft search
    for (var i = 0; i < all_countries.length; i++)
      if (config.populstat.countries[all_countries[i]].toLowerCase().trim().indexOf(country_name) != -1) {
        country_exists = [(!options.return_key) ? populstat_obj[all_countries[i]] : all_countries[i], true];
        break;
      }
    
    //Return statement
    return (country_exists[1]) ? country_exists[0] : undefined;
  };

  global.processPopulstatData = function () {
    //Declare local instance variables
    var agglomeration_patterns = config.populstat.processing.agglomeration_patterns;
    if (!main.population.populstat) //Make sure main.population.populstat exists first
      main.population.populstat = JSON.parse(JSON.stringify(main.curl.populstat));
    var populstat_obj = main.population.populstat;

    //Iterate over all_countries
    var all_countries = Object.keys(populstat_obj);

    for (var i = 0; i < all_countries.length; i++) {
      var local_country = populstat_obj[all_countries[i]];
      var local_country_name = config.populstat.countries[all_countries[i]];
        if (!local_country_name) local_country_name = all_countries[i];

      console.log(`- Processing ${local_country_name} (${i + 1}/${all_countries.length}) ..`);
      
      //Iterate over all_cities
      var all_cities = Object.keys(local_country);

      for (var x = 0; x < all_cities.length; x++) {
        var local_city = local_country[all_cities[x]];
        var local_city_names = [local_city.name];
          if (local_city.other_names)
            local_city_names = local_city_names.concat(local_city.other_names);
        
        var is_agglomeration = false;
        var is_agglomeration_of = "";

        //.particulars
        if (local_city["particulars of the data"])
          local_city.particulars = local_city["particulars of the data"];
        if (local_city.particulars) 
          if (typeof local_city.particulars == "string") {
            var split_particulars = local_city.particulars.split(";");
              for (var y = 0; y < split_particulars.length; y++)
                split_particulars[y] = split_particulars[y].trim().toLowerCase();

            //Iterate over agglomeration_patterns
            for (var y = 0; y < agglomeration_patterns.length; y++)
              for (var z = 0; z < split_particulars.length; z++)
                if (split_particulars[z].indexOf(agglomeration_patterns[y]) != -1) {
                  is_agglomeration = true;
                  is_agglomeration_of = split_particulars[z].replace(agglomeration_patterns[y], "")
                    .replace(/\([^)]*\)/g, "").trim(); //Remove round brackets
                }
          }
        
        if (is_agglomeration)
          local_city.is_agglomeration_of = is_agglomeration_of;

        //If is_agglomeration is true; find the city double and subtract it from the agglomeration
        var other_city_obj;

        //Iterate over local_city_names
        for (var y = 0; y < local_city_names.length; y++) {
          var local_city_name = `${local_city_names[y]} (agglomeration), ${local_country_name}`;
          other_city_obj = getPopulstatCity(local_city_name, { same_country: true });

          if (other_city_obj) {
            break;
          } else {
            local_city_name = `${local_city_names[y]}, ${local_country_name}`;
            other_city_obj = getPopulstatCity(local_city_name, { same_country: true });
          }
        }

        if (other_city_obj)
          if (other_city_obj.name == local_city.name)
            continue;

        //Subtract the other city from the agglomeration
        if (other_city_obj) 
          if (other_city_obj.population && local_city.population) 
            if (other_city_obj.name != local_city.name) {
              var all_population_keys = Object.keys(other_city_obj.population);
              
              for (var y = 0; y < all_population_keys.length; y++) {
                var local_value = local_city.population[all_population_keys[y]];

                modifyValue(other_city_obj.population, all_population_keys[y], returnSafeNumber(local_value*-1));

                //Remove any zero values
                if (other_city_obj.population[all_population_keys[y]] <= 0)
                  delete other_city_obj.population[all_population_keys[y]];
              }
            }
      }
    }

    //Return statement
    return main.population.populstat;
  };
}