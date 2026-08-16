//Initialise functions
{
  global.areNamesSimilar = function (arg0_name, arg1_ot_name) {
    //Convert from parameters
    var name = arg0_name;
    var ot_name = arg1_ot_name;
    
    //Declare local instance variables
    name = name.toLowerCase().trim();
    ot_name = ot_name.toLowerCase().trim();
    
    //Return statement
    if (ot_name.includes(name) || name.includes(ot_name) || name == ot_name)
      return true;
  };
  
  global.getCoordsDistance = function (arg0_coords, arg1_coords) {
    //Convert from parameters
    var coords = arg0_coords;
    var ot_coords = arg1_coords;
    
    //Declare local instance variables
    var d_lat = ot_coords[0] - coords[0];
    var d_lng = ot_coords[1] - coords[1];
    
    //Return statement
    return Math.sqrt(d_lat*d_lat + d_lng*d_lng);
  };
  
  global.getPeakPopulation = function (arg0_population_obj) {
    //Convert from parameters
    var population_obj = arg0_population_obj;
    
    //Declare local instance variables
    var max_pop = 0;
    
    if (population_obj) {
      let year_keys = Object.keys(population_obj);
      
      for (let i = 0; i < year_keys.length; i++) {
        let year_val = population_obj[year_keys[i]];
        
        if (Array.isArray(year_val)) {
          for (let x = 0; x < year_val.length; x++) {
            let parsed_val = parseFloat(year_val[x]);
            if (!isNaN(parsed_val) && parsed_val > max_pop)
              max_pop = parsed_val;
          }
        } else {
          let parsed_val = parseFloat(year_val);
          if (!isNaN(parsed_val) && parsed_val > max_pop)
            max_pop = parsed_val;
        }
      }
    }
    
    //Return statement
    return max_pop;
  };
  
  global.initialiseUUD = function () {
    //Declare local instance variables
    var options = {
      populstat: {
        data: getPopulstatObject(), //semantic_precision: 0.05
      },
      chandler_modelski: {
        data: getWorldcitypopObject(),
        is_metro: true,
        //legacy_chandler_modelski_merging: true
        precision: 0.1, semantic_precision: 1
      },
      devries: {
        data: getDeVriesCitiesObject(), precision: 0.1, semantic_precision: 1
      },
      buringh: {
        data: getBuringhObject(), precision: 0.05, semantic_precision: 1
      }
    };
    var return_obj = {};
    
    //1. Unify all databases; iterate over all_options_keys
    var all_options_keys = Object.keys(options);
    
    for (let i = 0; i < all_options_keys.length; i++) {
      let local_db = options[all_options_keys[i]];
      
      //Merge in order
      let all_local_cities = Object.keys(local_db.data);
      
      if (i === 0)
        for (let x = 0; x < all_local_cities.length; x++) {
          let local_city = local_db.data[all_local_cities[x]];
          
          return_obj[all_local_cities[x]] = local_city;
        }
      
      //Regular Euclidean merging based on precision rules
      {
        //1. Iterate over all_local_cities and check against dynamically updated all_return_keys coords
        for (let x = 0; x < all_local_cities.length; x++) {
          let all_return_keys = Object.keys(return_obj);
          var local_city = local_db.data[all_local_cities[x]];
          var was_merged = [false, undefined];
          
          //.precision check
          if (local_db.precision) {
            let closest_uud_city = null;
            let closest_distance = Infinity;
            
            for (var y = 0; y < all_return_keys.length; y++) {
              var local_uud_city = return_obj[all_return_keys[y]];
              
              if (local_uud_city && local_uud_city.coords && local_city.coords) {
                try {
                  var local_distance = getCoordsDistance(local_uud_city.coords, local_city.coords);
                  
                  if (local_distance <= local_db.precision && local_distance < closest_distance) {
                    closest_uud_city = local_uud_city;
                    closest_distance = local_distance;
                  }
                } catch (e) {
                  console.error(e);
                }
              }
            }
            
            if (closest_uud_city) {
              console.log(
                `- (!CM): Proximity merge match found (${closest_uud_city.name} - ${local_city.name}):`,
                closest_distance
              );
              was_merged = [true, closest_uud_city];
            }
          }
          
          //.semantic_precision check
          if (!was_merged[0])
            if (local_db.semantic_precision) {
              //Check if local_city should be merged using semantic_precision threshold
              let city_names = [`${local_city.name}`, `${local_city.key}`];
              let closest_uud_city_match = [Infinity, undefined];
              
              //Iterate over all .names, .other_names if possible
              if (local_city.other_names)
                for (let y = 0; y < local_city.other_names.length; y++) {
                  city_names.push(`${local_city.other_names[y]}`);
                  if (local_city.country)
                    city_names.push(`${local_city.other_names[y]}, ${local_city.country}`);
                }
              
              //Iterate over all city_names, looking for a semantic match
              for (let y = 0; y < city_names.length; y++) try {
                let local_uud_city = getFlattenedPopulstatCity(city_names[y], {
                  populstat_obj: return_obj
                });
                
                if (local_uud_city)
                  if (local_uud_city.coords && local_city.coords) try {
                    let local_distance = getCoordsDistance(local_uud_city.coords, local_city.coords);
                    
                    if (local_distance <= closest_uud_city_match[0])
                      closest_uud_city_match = [local_distance, local_uud_city];
                  } catch (e) { console.error(e); }
              } catch (e) {
                console.error(e);
              }
              
              //Set was_merged if possible
              if (closest_uud_city_match[0] <= local_db.semantic_precision) try {
                if (!(i == 0 && return_obj[closest_uud_city_match[1].key])) {
                  console.log(`- (!CM): Semantic merge match found: ${local_city.name}, ${closest_uud_city_match[1].name}, distance: ${closest_uud_city_match[0]}`);
                  was_merged = [true, closest_uud_city_match[1]];
                }
              } catch (e) { console.error(e); }
            }
          
          //Regular merge logic; merge into actual_city - direct key check prior to merging
          if (i != 0 && return_obj[all_local_cities[x]])
            was_merged = [true, return_obj[all_local_cities[x]]];
          
          //Merge cities found to be identical
          let is_separate_city = false;
          
          if (was_merged[0]) {
            let actual_city = return_obj[was_merged[1].key];
            
            if (actual_city) {
              let local_peak_pop = getPeakPopulation(local_city.population);
              let actual_peak_pop = getPeakPopulation(actual_city.population);
              let old_actual_name = actual_city.name;
              
              if (local_peak_pop > actual_peak_pop && local_city.name)
                actual_city.name = local_city.name;
              
              console.log(`- (!CM): Merging '${local_city.name}' into '${old_actual_name}' -> Selected name: '${actual_city.name}'`);
              
              if (local_city.is_agglomeration_of)
                actual_city.is_agglomeration_of = local_city.is_agglomeration_of;
              if (local_city.population)
                if (local_db.is_metro) {
                  actual_city.population = mergeCityPopulations(local_city.population, actual_city.population);
                } else {
                  actual_city.population = mergeCityPopulations(actual_city.population, local_city.population);
                }
              actual_city.type = all_options_keys[i];
              
              return_obj[actual_city.key] = actual_city;
              
              if (all_local_cities[x] != actual_city.key) delete return_obj[all_local_cities[x]];
            } else {
              is_separate_city = true;
            }
          } else {
            is_separate_city = true;
          }
          
          if (is_separate_city) {
            console.log(`- (!CM): Adding separate city: (${all_options_keys[i]})`, local_city.name);
            local_city.type = all_options_keys[i];
            
            return_obj[all_local_cities[x]] = local_city;
          }
        }
      }
    }
    
    //1.5 Global post-deduplication pass across all merged entries
    console.time(`- Deduplicating raw UUD entries...`);
    let deduplicate_keys = Object.keys(return_obj);
    
    for (let i = 0; i < deduplicate_keys.length; i++) {
      let city_a_key = deduplicate_keys[i];
      let city_a = return_obj[city_a_key];
      
      if (city_a)
        for (let j = i + 1; j < deduplicate_keys.length; j++) {
          let city_b_key = deduplicate_keys[j];
          let city_b = return_obj[city_b_key];
          
          if (city_b) {
            let should_merge = false;
            
            //Check duplicate coordinates and processed name/other_names match
            if (city_a.coords && city_b.coords) try {
              let dist = getCoordsDistance(city_a.coords, city_b.coords);
              
              if (dist <= 5) {
                let city_a_names = [];
                if (city_a.name) {
                  let local_processed_name = processCityName(city_a.name);
                  if (local_processed_name) city_a_names.push(local_processed_name);
                }
                if (Array.isArray(city_a.other_names))
                  for (let x = 0; x < city_a.other_names.length; x++) {
                    let local_processed_name = processCityName(city_a.other_names[x]);
                    if (local_processed_name) city_a_names.push(local_processed_name);
                  }
                
                let city_b_names = [];
                if (city_b.name) {
                  let local_processed_name = processCityName(city_b.name);
                  if (local_processed_name) city_b_names.push(local_processed_name);
                }
                if (Array.isArray(city_b.other_names))
                  for (let x = 0; x < city_b.other_names.length; x++) {
                    let local_processed_name = processCityName(city_b.other_names[x]);
                    if (local_processed_name) city_b_names.push(local_processed_name);
                  }
                
                for (let x = 0; x < city_a_names.length; x++) {
                  for (let y = 0; y < city_b_names.length; y++)
                    if (city_a_names[x] === city_b_names[y]) {
                      should_merge = true;
                      break;
                    }
                  if (should_merge) break;
                }
              }
            } catch (e) {
              console.error(e);
            }
            
            if (should_merge) {
              let a_peak = getPeakPopulation(city_a.population);
              let b_peak = getPeakPopulation(city_b.population);
              let old_a_name = city_a.name;
              
              if (b_peak > a_peak && city_b.name)
                city_a.name = city_b.name;
              
              console.log(`- (!CM): Post-deduplication merge '${city_b.name}' into '${old_a_name}' -> Selected name: '${city_a.name}'`);
              
              if (city_b.is_agglomeration_of)
                city_a.is_agglomeration_of = city_b.is_agglomeration_of;
              if (city_b.population)
                city_a.population = mergeCityPopulations(city_a.population, city_b.population);
              
              delete return_obj[city_b_key];
            }
          }
        }
    }
    console.timeEnd(`- Deduplicating raw UUD entries...`);
    
    //2. Flatten .population array entries; take weightedGeometricMean
    var all_return_keys = Object.keys(return_obj);
    
    //Iterate over all_return_keys
    for (let i = 0; i < all_return_keys.length; i++) {
      let local_city = return_obj[all_return_keys[i]];
      
      //Check to make sure local_city has valid coords and population
      if (local_city.coords && Array.isArray(local_city.coords))
        if (!isNaN(parseFloat(local_city.coords[0])) && !isNaN(parseFloat(local_city.coords[1]))) {
          local_city.coords = [parseFloat(local_city.coords[0]), parseFloat(local_city.coords[1])];
          
          if (local_city.population) {
            let all_population_keys = Object.keys(local_city.population);
            
            for (let x = 0; x < all_population_keys.length; x++) {
              let local_value = local_city.population[all_population_keys[x]];
              
              if (Array.isArray(local_value))
                if (local_value.length > 1) {
                  local_city.population[all_population_keys[x]] = weightedGeometricMean(local_value);
                } else {
                  local_city.population[all_population_keys[x]] = local_value[0];
                }
            }
          }
        } else {
          //Delete malformed cities
          delete return_obj[all_return_keys[i]];
        }
    }
    
    //Save uud_obj
    console.time(`- Saving raw UUD data...`);
    FileManager.saveFileAsJSON(config.defines.common.input_file_paths.uud_cities, return_obj);
    console.timeEnd(`- Saving raw UUD data...`);
    
    //Return statement
    return return_obj;
  };
  
  global.interpolateUUD = function (arg0_uud_obj, arg1_options) {
    //Convert from praameters
    var uud_obj = arg0_uud_obj;
    let options = (arg1_options) ? arg1_options : {};
    
    //Iterate over all years in config.uud.processing.hyde_years that is within the UUD domain
    for (var i = 0; i < config.uud.processing.hyde_years.length; i++) {
      let local_year = config.uud.processing.hyde_years[i];
      
      if (local_year >= config.uud.processing.uud_domain[0] && local_year <= config.uud.processing.uud_domain[1]) {
        console.log(`Interpolating for ${local_year} ..`);
        console.time(`- Processed UUD for ${local_year} ..`);
        uud_obj = interpolateUUDForYear(uud_obj, local_year, options);
        console.timeEnd(`- Processed UUD for ${local_year} ..`);
      }
    }
    
    //Return statement
    return uud_obj;
  };
  
  global.interpolateUUDForYear = function (arg0_uud_obj, arg1_year, arg2_options) {
    //Convert from parameters
    var uud_obj = arg0_uud_obj;
    var year = parseInt(arg1_year);
    let options = (arg2_options) ? arg2_options : {};
    
    //Initialise options
    if (!options.mode) options.mode = "linear";
    
    //Declare local instance variables
    var all_cities = Object.keys(uud_obj);
    
    //Iterate over all_cities
    for (let i = 0; i < all_cities.length; i++) try {
      let local_city = uud_obj[all_cities[i]];
      if (i % 1000 === 0 && i !== 0) console.log(`- ${i}/${all_cities.length} for ${year}`);
      
      let valid_keys = 0;
      
      if (local_city.population) {
        let all_population_keys = Object.keys(local_city.population);
        
        for (let x = 0; x < all_population_keys.length; x++) {
          let local_population = local_city.population[all_population_keys[x]];
          
          if (local_population > 0)
            valid_keys++;
        }
      }
      
      if (local_city.population && valid_keys >= 2 && local_city.population[year] === undefined)
        if (options.mode === "cubic") {
          local_city.population = cubicSplineInterpolationObject(local_city.population, { years: [year] });
        } else if (options.mode === "linear") {
          local_city.population = linearInterpolationObject(local_city.population, { years: [year] });
        }
    } catch (e) {
      console.error(e);
    }
    
    //Return statement
    return uud_obj;
  };
  
  global.mergeMetroToCityPopulations = function (arg0_metro_population_obj, arg1_population_obj) {
    //Convert from parameters
    var metro_population_obj = JSON.parse(JSON.stringify(arg0_metro_population_obj));
    var population_obj = JSON.parse(JSON.stringify(arg1_population_obj));
    
    //Declare local instance variables
    var all_metro_keys = Object.keys(metro_population_obj);
    var geomean_errors_in_domain = [];
    var population_domain = [];
    var union_obj = JSON.parse(JSON.stringify(population_obj));
    
    //Establish population_domain
    var union_keys = Object.keys(union_obj).map(Number).sort((a, b) => a - b);
    population_domain = [union_keys[0], union_keys[union_keys.length - 1]];
    
    //Iterate over all_metro_keys in population_domain; calculate geomean_scalar
    var years_to_interpolate = [];
    
    for (let i = 0; i < all_metro_keys.length; i++)
      if (parseInt(all_metro_keys[i]) >= population_domain[0] && parseInt(all_metro_keys[i]) < population_domain[1])
        years_to_interpolate.push(parseInt(all_metro_keys[i]));
    union_obj = cubicSplineInterpolationObject(union_obj, { years: years_to_interpolate });
    
    for (let i = 0; i < all_metro_keys.length; i++)
      if (parseInt(all_metro_keys[i]) >= population_domain[0] && parseInt(all_metro_keys[i]) < population_domain[1])
        if (union_obj[all_metro_keys[i]]) {
          let local_union_value = union_obj[all_metro_keys[i]];
          let local_value = metro_population_obj[all_metro_keys[i]];
          
          geomean_errors_in_domain.push(local_value/local_union_value);
        }
    
    //Merge metro_population_obj into population_obj after dividing by geomean_scalar, but only if value is less than existing geomean
    var geomean_scalar = weightedGeometricMean(geomean_errors_in_domain);
    if (geomean_scalar == 0) geomean_scalar = 1;
    metro_population_obj = operateObject(metro_population_obj, `n = n/${geomean_scalar}`);
    
    all_metro_keys = Object.keys(metro_population_obj);
    
    for (let i = 0; i < all_metro_keys.length; i++) {
      var in_non_metro_domain = (parseInt(all_metro_keys[i]) >= population_domain[0] && parseInt(all_metro_keys[i]) < population_domain[1]);
      var local_population = population_obj[all_metro_keys[i]];
      var local_value = metro_population_obj[all_metro_keys[i]];
      
      if (in_non_metro_domain) {
        var local_geomean = weightedGeometricMean(getList(local_population));
        var local_population_list = getList(local_population);
        
        if (local_value <= local_geomean)
          if (!Array.isArray(local_value)) {
            local_population_list.push(local_value)
          } else {
            local_population_list = local_population_list.concat(local_value);
          }
      } else {
        if (!Array.isArray(local_population)) {
          if (!Array.isArray(local_value)) {
            population_obj[all_metro_keys[i]] = [local_value];
          } else {
            population_obj[all_metro_keys[i]] = local_value;
          }
        } else {
          if (!Array.isArray(local_value)) {
            population_obj[all_metro_keys[i]].push(local_value);
          } else {
            population_obj[all_metro_keys[i]] = population_obj[all_metro_keys[i]].concat(local_value);
          }
        }
      }
    }
    
    //Return statement
    return population_obj;
  }
  
  global.mergeCityPopulations = function (arg0_population_obj, arg1_population_obj) {
    //Convert from parameters
    var population_obj = JSON.parse(JSON.stringify(arg0_population_obj));
    var ot_population_obj = JSON.parse(JSON.stringify(arg1_population_obj));
    
    //Declare local instance variables
    var all_ot_population_keys = Object.keys(ot_population_obj);
    var all_population_keys = Object.keys(population_obj);
    
    //Make everything in all_population_keys an array
    for (let i = 0; i < all_population_keys.length; i++)
      if (!Array.isArray(population_obj[all_population_keys[i]]))
        population_obj[all_population_keys[i]] = [population_obj[all_population_keys[i]]];
    
    //Iterate over all_ot_population_keys and attempt their merger into population_obj
    for (let i = 0; i < all_ot_population_keys.length; i++) {
      let local_value = ot_population_obj[all_ot_population_keys[i]];
      
      if (Array.isArray(local_value))
        local_value = local_value.flat(Infinity);
      
      if (Array.isArray(population_obj[all_ot_population_keys[i]])) {
        if (!Array.isArray(local_value)) {
          population_obj[all_ot_population_keys[i]].push(local_value);
        } else {
          population_obj[all_ot_population_keys[i]] = population_obj[all_ot_population_keys[i]].concat(local_value);
        }
      } else {
        if (!Array.isArray(local_value)) {
          population_obj[all_ot_population_keys[i]] = [local_value];
        } else {
          population_obj[all_ot_population_keys[i]] = local_value;
        }
      }
    }
    
    //Return statement
    return population_obj;
  };
  
  global.processCityName = function (arg0_name) {
    //Convert from parameters
    var name = (arg0_name) ? `${arg0_name}` : "";
    
    //Declare local instance variables
    name = name.replace(/\(([^)]+)\)/g, function (match, p1) {
      return (p1.toLowerCase().trim() === "agglomeration") ? "(agglomeration)" : "";
    });
    
    //Return statement
    return name.replace(/\s+/g, " ").trim().toLowerCase();
  };
  
  //saveUUDData() - Both initialises, then saves UUD data.
  global.saveUUDData = function (arg0_options) {
    //Convert from parameters
    let options = (arg0_options) ? arg0_options : {};
    
    //Declare local instance variables
    console.time(`- Initialising UUD ..`);
    var uud_obj = initialiseUUD(options);
    console.timeEnd(`- Initialising UUD ..`);
    
    //Interpolate uud_obj
    uud_obj = interpolateUUD(uud_obj);
    saveUUDObject(uud_obj);
  };
  
  global.saveUUDObject = function (arg0_uud_obj) {
    //Convert from parameters
    var uud_obj = arg0_uud_obj;
    
    //Save uud_obj
    console.time(`- Saving UUD object ..`);
    FileManager.saveFileAsJSON(config.defines.common.input_file_paths.processed_uud_cities, uud_obj);
    console.timeEnd(`- Saving UUD object ..`);
  };
}