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
  
  global.initialiseUUD = function (arg0_options) {
    //Declare local instance variables
    var options = {
      populstat: {
        data: getPopulstatObject(), //semantic_precision: 0.05
      },
      chandler_modelski: {
        data: getWorldcitypopObject(),
        is_metro: true,
        //legacy_chandler_modelski_merging: true
        precision: 0.05, semantic_precision: 1
      },
      devries: {
        data: getDeVriesCitiesObject(), precision: 0.1, semantic_precision: 1
      },
      buringh: {
        data: getBuringhObject(), precision: 0.05, semantic_precision: 1
      }
    };
    var return_obj = {};
    var max_explicit_precision = 0;
    var opt_keys = Object.keys(options);
    
    for (let k = 0; k < opt_keys.length; k++) {
      if (options[opt_keys[k]].precision && options[opt_keys[k]].precision > max_explicit_precision)
        max_explicit_precision = options[opt_keys[k]].precision;
    }
    if (max_explicit_precision === 0) max_explicit_precision = 0.1;
    
    function isAgglomeration(city) {
      if (!city) return false;
      if (city.is_agglomeration) return true;
      if (city.name) {
        let lower_n = city.name.toLowerCase();
        if (lower_n.includes("agglomeration") || lower_n.includes("greater")) return true;
      }
      return false;
    }
    
    function getAllCityNames(city) {
      if (!city) return [];
      let names = [];
      if (city.name) {
        let proc = processCityName(city.name);
        if (proc && !names.includes(proc)) names.push(proc);
      }
      if (Array.isArray(city.other_names)) {
        for (let k = 0; k < city.other_names.length; k++) {
          let proc = processCityName(city.other_names[k]);
          if (proc && !names.includes(proc)) names.push(proc);
        }
      }
      if (Array.isArray(city.original_names)) {
        for (let k = 0; k < city.original_names.length; k++) {
          let proc = processCityName(city.original_names[k]);
          if (proc && !names.includes(proc)) names.push(proc);
        }
      }
      return names;
    }
    
    function checkExactNameMatch(city_a, city_b) {
      let names_a = getAllCityNames(city_a);
      let names_b = getAllCityNames(city_b);
      for (let x = 0; x < names_a.length; x++) {
        for (let y = 0; y < names_b.length; y++) {
          if (names_a[x] && names_a[x] === names_b[y]) return true;
        }
      }
      return false;
    }
    
    //1. Unify all databases; iterate over all_options_keys
    var all_options_keys = Object.keys(options);
    
    for (let i = 0; i < all_options_keys.length; i++) {
      let local_db = options[all_options_keys[i]];
      let all_local_cities = Object.keys(local_db.data);
      
      //Ensure key field & original_names exist on local cities
      for (let x = 0; x < all_local_cities.length; x++) {
        let city_obj = local_db.data[all_local_cities[x]];
        if (city_obj) {
          if (!city_obj.key) city_obj.key = all_local_cities[x];
          if (city_obj.name) {
            let lower_n = city_obj.name.toLowerCase();
            if (lower_n.includes("agglomeration") || lower_n.includes("greater")) {
              city_obj.is_agglomeration = true;
              if (!city_obj.is_agglomeration_of)
                city_obj.is_agglomeration_of = processCityName(city_obj.name);
            }
          }
          if (!city_obj.original_names) {
            city_obj.original_names = [];
            if (city_obj.name) {
              let proc_n = processCityName(city_obj.name);
              if (proc_n) city_obj.original_names.push(proc_n);
            }
            if (Array.isArray(city_obj.other_names))
              for (let k = 0; k < city_obj.other_names.length; k++) {
                let proc_n = processCityName(city_obj.other_names[k]);
                if (proc_n && !city_obj.original_names.includes(proc_n))
                  city_obj.original_names.push(proc_n);
              }
          }
        }
      }
      
      //Iterate over local cities and merge against return_obj
      let all_return_keys = Object.keys(return_obj);
      
      for (let x = 0; x < all_local_cities.length; x++) {
        var local_city = local_db.data[all_local_cities[x]];
        var was_merged = [false, undefined];
        
        if (local_city.name) {
          let lower_n = local_city.name.toLowerCase();
          if (lower_n.includes("agglomeration") || lower_n.includes("greater")) {
            local_city.is_agglomeration = true;
            if (!local_city.is_agglomeration_of)
              local_city.is_agglomeration_of = processCityName(local_city.name);
          }
        }
        
        all_return_keys = Object.keys(return_obj);
        
        for (var y = 0; y < all_return_keys.length; y++) {
          var local_uud_city = return_obj[all_return_keys[y]];
          if (local_uud_city && local_uud_city.coords && local_city.coords) {
            var local_distance = getCoordsDistance(local_uud_city.coords, local_city.coords);
            var same_agg = (isAgglomeration(local_uud_city) === isAgglomeration(local_city));
            
            if (!same_agg) {
              if (local_distance <= (local_db.precision || max_explicit_precision || 0.15)) {
                let city_proper = isAgglomeration(local_uud_city) ? local_city : local_uud_city;
                let agg_city = isAgglomeration(local_uud_city) ? local_uud_city : local_city;
                if (!city_proper.is_agglomeration_of)
                  city_proper.is_agglomeration_of = agg_city.is_agglomeration_of || processCityName(agg_city.name);
              }
              continue;
            }
            
            // Distance < 0.01 forced merge no matter what
            if (local_distance < 0.01) {
              console.log(`- (!CM): Distance < 0.01 forced merge (${local_uud_city.name} - ${local_city.name}):`, local_distance);
              was_merged = [true, local_uud_city];
              break;
            }
            
            // Exact same name (including .other_names) + within search radius -> force merge
            let is_exact_name = checkExactNameMatch(local_uud_city, local_city);
            let search_radius = Math.max(local_db.precision || 0, local_db.semantic_precision || 0, max_explicit_precision, 0.15);
            
            if (is_exact_name && local_distance <= search_radius) {
              console.log(`- (!CM): Exact name proximity merge (${local_uud_city.name} - ${local_city.name}):`, local_distance);
              was_merged = [true, local_uud_city];
              break;
            }
            
            // Standard precision check with population ratio guard
            if (local_db.precision && local_distance <= local_db.precision) {
              console.log(`- (!CM): Proximity merge match found (${local_uud_city.name} - ${local_city.name}):`, local_distance);
              was_merged = [true, local_uud_city];
              break;
            }
          }
        }
        
        // .semantic_precision check
        if (!was_merged[0] && local_db.semantic_precision) {
          let city_names = getAllCityNames(local_city);
          let closest_uud_city_match = [Infinity, undefined];
          
          for (let y = 0; y < city_names.length; y++) try {
            let local_uud_city = getFlattenedPopulstatCity(city_names[y], {
              populstat_obj: return_obj
            });
            
            if (local_uud_city) {
              if (isAgglomeration(local_uud_city) !== isAgglomeration(local_city)) {
                let city_proper = isAgglomeration(local_uud_city) ? local_city : local_uud_city;
                let agg_city = isAgglomeration(local_uud_city) ? local_uud_city : local_city;
                if (!city_proper.is_agglomeration_of)
                  city_proper.is_agglomeration_of = agg_city.is_agglomeration_of || processCityName(agg_city.name);
                continue;
              }
              
              if (checkExactNameMatch(local_city, local_uud_city) && local_uud_city.coords && local_city.coords) try {
                let local_distance = getCoordsDistance(local_uud_city.coords, local_city.coords);
                
                if (local_distance <= closest_uud_city_match[0])
                  closest_uud_city_match = [local_distance, local_uud_city];
              } catch (e) { console.error(e); }
            }
          } catch (e) {
            console.error(e);
          }
          
          if (closest_uud_city_match[0] <= local_db.semantic_precision) try {
            if (closest_uud_city_match[1] && return_obj[closest_uud_city_match[1].key]) {
              console.log(`- (!CM): Semantic merge match found: ${local_city.name}, ${closest_uud_city_match[1].name}, distance: ${closest_uud_city_match[0]}`);
              was_merged = [true, closest_uud_city_match[1]];
            }
          } catch (e) { console.error(e); }
        }
        
        if (!was_merged[0] && return_obj[all_local_cities[x]]) {
          let direct_match = return_obj[all_local_cities[x]];
          if (isAgglomeration(direct_match) === isAgglomeration(local_city))
            was_merged = [true, direct_match];
        }
        
        let is_separate_city = false;
        
        if (was_merged[0]) {
          let actual_city = was_merged[1];
          
          if (actual_city) {
            mergeCityEntries(actual_city, local_city, local_db.is_metro);
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
    
    //1.5 Post-deduplication pass preserving agglomeration vs city proper separation
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
            if (isAgglomeration(city_a) !== isAgglomeration(city_b)) {
              if (city_a.coords && city_b.coords) try {
                let dist = getCoordsDistance(city_a.coords, city_b.coords);
                if (dist <= Math.max(max_explicit_precision, 0.25)) {
                  let city_proper = isAgglomeration(city_a) ? city_b : city_a;
                  let agg_city = isAgglomeration(city_a) ? city_a : city_b;
                  if (!city_proper.is_agglomeration_of)
                    city_proper.is_agglomeration_of = agg_city.is_agglomeration_of || processCityName(agg_city.name);
                }
              } catch (e) {
                console.error(e);
              }
              continue;
            }
            
            let should_merge = false;
            
            if (city_a.coords && city_b.coords) try {
              let dist = getCoordsDistance(city_a.coords, city_b.coords);
              let is_exact_name = checkExactNameMatch(city_a, city_b);
              
              if (dist < 0.01) {
                should_merge = true;
              } else if (is_exact_name && dist <= Math.max(max_explicit_precision, 0.25)) {
                should_merge = true;
              } else if (dist <= max_explicit_precision) {
                if (is_exact_name) should_merge = true;
              }
            } catch (e) {
              console.error(e);
            }
            
            if (should_merge) {
              mergeCityEntries(city_a, city_b, false);
              delete return_obj[city_b_key];
            }
          }
        }
    }
    console.timeEnd(`- Deduplicating raw UUD entries...`);
    
    //2. Flatten .population array entries; take weightedGeometricMean
    var all_return_keys = Object.keys(return_obj);
    
    for (let i = 0; i < all_return_keys.length; i++) {
      let local_city = return_obj[all_return_keys[i]];
      
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
  
  global.mergeCityEntries = function (arg0_target_city, arg1_source_city, arg2_is_metro) {
    //Convert from parameters
    var target_city = arg0_target_city;
    var source_city = arg1_source_city;
    var is_metro = arg2_is_metro;
    
    if (!target_city || !source_city) return target_city;
    
    //Initialize original_names set if missing
    if (!target_city.original_names) {
      target_city.original_names = [];
      if (target_city.name) {
        let proc_n = processCityName(target_city.name);
        if (proc_n) target_city.original_names.push(proc_n);
      }
      if (Array.isArray(target_city.other_names))
        for (let i = 0; i < target_city.other_names.length; i++) {
          let proc_n = processCityName(target_city.other_names[i]);
          if (proc_n && !target_city.original_names.includes(proc_n))
            target_city.original_names.push(proc_n);
        }
    }
    
    //Initialize name_peaks and name_coords tracking map
    if (!target_city.name_peaks) {
      target_city.name_peaks = {};
      target_city.name_coords = {};
      if (target_city.name) {
        let target_peak = getPeakPopulation(target_city.population);
        target_city.name_peaks[target_city.name] = target_peak;
        if (target_city.coords) target_city.name_coords[target_city.name] = target_city.coords;
      }
    }
    
    let source_peak = getPeakPopulation(source_city.population);
    if (source_city.name) {
      let current_source_name_peak = target_city.name_peaks[source_city.name] || 0;
      if (source_peak >= current_source_name_peak) {
        target_city.name_peaks[source_city.name] = source_peak;
        if (source_city.coords) target_city.name_coords[source_city.name] = source_city.coords;
      }
    }
    if (source_city.name_peaks) {
      let source_name_keys = Object.keys(source_city.name_peaks);
      for (let i = 0; i < source_name_keys.length; i++) {
        let name_key = source_name_keys[i];
        let name_peak = source_city.name_peaks[name_key];
        let current_peak = target_city.name_peaks[name_key] || 0;
        if (name_peak >= current_peak) {
          target_city.name_peaks[name_key] = name_peak;
          if (source_city.name_coords && source_city.name_coords[name_key]) {
            target_city.name_coords[name_key] = source_city.name_coords[name_key];
          } else if (source_city.coords) {
            target_city.name_coords[name_key] = source_city.coords;
          }
        }
      }
    }
    
    //Determine primary name with highest individual peak population and inherit its coords
    let old_target_name = target_city.name;
    let best_name = old_target_name;
    let max_name_peak = -1;
    let all_name_keys = Object.keys(target_city.name_peaks);
    
    for (let i = 0; i < all_name_keys.length; i++) {
      let name_key = all_name_keys[i];
      let name_peak = target_city.name_peaks[name_key];
      if (name_peak > max_name_peak) {
        max_name_peak = name_peak;
        best_name = name_key;
      }
    }
    
    if (best_name) {
      target_city.name = best_name;
      if (target_city.name_coords && target_city.name_coords[best_name])
        target_city.coords = target_city.name_coords[best_name];
    }
    
    console.log(`- (!CM): Merging '${source_city.name}' into '${old_target_name}' -> Selected name: '${target_city.name}'`);
    
    //Merge other_names array without duplicates
    if (!target_city.other_names) target_city.other_names = [];
    let candidate_names = [];
    if (old_target_name) candidate_names.push(old_target_name);
    if (source_city.name) candidate_names.push(source_city.name);
    if (Array.isArray(source_city.other_names))
      candidate_names = candidate_names.concat(source_city.other_names);
    if (Array.isArray(target_city.other_names))
      candidate_names = candidate_names.concat(target_city.other_names);
    
    for (let i = 0; i < candidate_names.length; i++) {
      let cur_name = candidate_names[i];
      if (cur_name && cur_name !== target_city.name && !target_city.other_names.includes(cur_name))
        target_city.other_names.push(cur_name);
    }
    
    //Merge attributes
    if (source_city.is_agglomeration_of)
      target_city.is_agglomeration_of = source_city.is_agglomeration_of;
    
    if (source_city.population)
      if (is_metro) {
        target_city.population = mergeCityPopulations(source_city.population, target_city.population);
      } else {
        target_city.population = mergeCityPopulations(target_city.population, source_city.population);
      }
    
    return target_city;
  };
  
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
          if (!Array.isArray(local_population)) {
            population_obj[all_metro_keys[i]].push(local_value);
          } else {
            population_obj[all_metro_keys[i]] = population_obj[all_metro_keys[i]].concat(local_value);
          }
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
    name = name.replace(/\([^)]*\)/g, function (match) {
      var lower_match = match.toLowerCase();
      return (lower_match.includes("agglomeration") || lower_match.includes("greater")) ? match.toLowerCase() : "";
    });
    name = name.replace(/greater\s*/gi, "");
    name = name.replace(/agglomeration\s*/gi, "");
    
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