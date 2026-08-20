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
        precision: 0.1, semantic_precision: 1
      },
      devries: {
        data: getDeVriesCitiesObject(), precision: 0.1, semantic_precision: 1
      },
      buringh: {
        data: getBuringhObject(), precision: 0.05, semantic_precision: 1
      }
    };
    let cannot_be_merged = [{
      name: "Gibraltar",
      ot_name: "Línea de la Concepción"
    }];
    var return_obj = {};
    var max_explicit_precision = 0;
    var opt_keys = Object.keys(options);
    
    for (let k = 0; k < opt_keys.length; k++) {
      if (options[opt_keys[k]].precision && options[opt_keys[k]].precision > max_explicit_precision)
        max_explicit_precision = options[opt_keys[k]].precision;
    }
    if (max_explicit_precision === 0) max_explicit_precision = 0.1;
    
    // Grid Optimization Helpers
    let city_grid = new Map();
    function getGridCells(coords, radius) {
      let min_lat = Math.floor(Number(coords[0]) - radius);
      let max_lat = Math.floor(Number(coords[0]) + radius);
      let min_lng = Math.floor(Number(coords[1]) - radius);
      let max_lng = Math.floor(Number(coords[1]) + radius);
      let cells = [];
      for (let lat = min_lat; lat <= max_lat; lat++) {
        for (let lng = min_lng; lng <= max_lng; lng++) {
          cells.push(`${lat},${lng}`);
        }
      }
      return cells;
    }
    function addToGrid(city) {
      if (!city || !city.coords) return;
      let lat = Math.floor(Number(city.coords[0]));
      let lng = Math.floor(Number(city.coords[1]));
      let cell = `${lat},${lng}`;
      if (!city_grid.has(cell)) city_grid.set(cell, new Set());
      city_grid.get(cell).add(city.key);
    }
    
    function isAgglomeration(city) {
      if (!city) return false;
      if (city.is_agglomeration) return true;
      if (city.name) {
        let lower_n = city.name.toLowerCase();
        if (lower_n.includes("agglomeration") || lower_n.includes("greater")) return true;
      }
      return false;
    }
    
    function isPopulationRatioValid(pop_a, pop_b) {
      if (!pop_a || !pop_b) return { valid: true, overlaps: false };
      
      let keys_a = Object.keys(pop_a).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      let keys_b = Object.keys(pop_b).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (keys_a.length === 0 || keys_b.length === 0) return { valid: true, overlaps: false };
      
      let min_a = keys_a[0], max_a = keys_a[keys_a.length - 1];
      let min_b = keys_b[0], max_b = keys_b[keys_b.length - 1];
      
      let int_start = Math.max(min_a, min_b);
      let int_end = Math.min(max_a, max_b);
      
      // If domains completely miss each other, guard NY vs Hoboken sizes using a 10x magnitude limit
      if (int_start > int_end) {
        let peak_a = getPeakPopulation(pop_a);
        let peak_b = getPeakPopulation(pop_b);
        if (peak_a > 0 && peak_b > 0) {
          let ratio = peak_a / peak_b;
          if (ratio < 0.1 || ratio > 10.0) return { valid: false, overlaps: false };
        }
        return { valid: true, overlaps: false };
      }
      
      let all_keys = Array.from(new Set([...keys_a, ...keys_b])).sort((a, b) => a - b);
      let check_keys = all_keys.filter(yr => yr >= int_start && yr <= int_end);
      
      let fail_count = 0;
      let valid_checks = 0;
      
      function getValueAtYear(pop, keys, yr) {
        if (pop[yr] !== undefined) {
          let val = Array.isArray(pop[yr]) ? pop[yr][0] : pop[yr];
          return parseFloat(val);
        }
        let lower = keys[0], upper = keys[keys.length - 1];
        for (let j = 0; j < keys.length; j++) {
          if (keys[j] < yr) lower = keys[j];
          if (keys[j] > yr) { upper = keys[j]; break; }
        }
        let val_lower = parseFloat(Array.isArray(pop[lower]) ? pop[lower][0] : pop[lower]);
        let val_upper = parseFloat(Array.isArray(pop[upper]) ? pop[upper][0] : pop[upper]);
        if (!isNaN(val_lower) && !isNaN(val_upper) && upper !== lower) {
          return val_lower + (val_upper - val_lower) * ((yr - lower) / (upper - lower));
        }
        return isNaN(val_lower) ? val_upper : val_lower;
      }
      
      for (let k = 0; k < check_keys.length; k++) {
        let yr = check_keys[k];
        let num_a = getValueAtYear(pop_a, keys_a, yr);
        let num_b = getValueAtYear(pop_b, keys_b, yr);
        
        if (!isNaN(num_a) && !isNaN(num_b) && num_a > 0 && num_b > 0) {
          valid_checks++;
          let ratio = num_a / num_b;
          // Widened ratio bound checks to 4x difference threshold 
          if (ratio < 0.25 || ratio > 4.0) {
            fail_count++;
          }
        }
      }
      
      // Majority-rule validation - Prevent single bad interpolated data points from blocking legitimate merges
      if (valid_checks > 0 && (fail_count / valid_checks) > 0.5) return { valid: false, overlaps: true };
      if (valid_checks > 0 && valid_checks <= 2 && fail_count === valid_checks) return { valid: false, overlaps: true };
      
      return { valid: true, overlaps: true };
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
    
    function isCannotBeMerged(city_a, city_b) {
      if (!city_a || !city_b) return false;
      let names_a = getAllCityNames(city_a);
      let names_b = getAllCityNames(city_b);
      
      if (city_a.name && !names_a.includes(city_a.name)) names_a.push(city_a.name);
      if (city_b.name && !names_b.includes(city_b.name)) names_b.push(city_b.name);
      
      if (Array.isArray(city_a.other_names)) {
        for (let k = 0; k < city_a.other_names.length; k++) {
          if (!names_a.includes(city_a.other_names[k])) names_a.push(city_a.other_names[k]);
        }
      }
      if (Array.isArray(city_b.other_names)) {
        for (let k = 0; k < city_b.other_names.length; k++) {
          if (!names_b.includes(city_b.other_names[k])) names_b.push(city_b.other_names[k]);
        }
      }
      if (Array.isArray(city_a.original_names)) {
        for (let k = 0; k < city_a.original_names.length; k++) {
          if (!names_a.includes(city_a.original_names[k])) names_a.push(city_a.original_names[k]);
        }
      }
      if (Array.isArray(city_b.original_names)) {
        for (let k = 0; k < city_b.original_names.length; k++) {
          if (!names_b.includes(city_b.original_names[k])) names_b.push(city_b.original_names[k]);
        }
      }
      
      for (let k = 0; k < cannot_be_merged.length; k++) {
        let rule = cannot_be_merged[k];
        if (!rule || !rule.name || !rule.ot_name) continue;
        
        let target_1 = String(rule.name).toLowerCase();
        let target_2 = String(rule.ot_name).toLowerCase();
        
        let proc_target_1 = typeof processCityName === "function" ? processCityName(rule.name) : "";
        let proc_target_2 = typeof processCityName === "function" ? processCityName(rule.ot_name) : "";
        
        let a_has_1 = false;
        let a_has_2 = false;
        let b_has_1 = false;
        let b_has_2 = false;
        
        for (let x = 0; x < names_a.length; x++) {
          let str_a = String(names_a[x]).toLowerCase();
          if (str_a.includes(target_1) || (proc_target_1 && str_a.includes(proc_target_1))) a_has_1 = true;
          if (str_a.includes(target_2) || (proc_target_2 && str_a.includes(proc_target_2))) a_has_2 = true;
        }
        
        for (let y = 0; y < names_b.length; y++) {
          let str_b = String(names_b[y]).toLowerCase();
          if (str_b.includes(target_1) || (proc_target_1 && str_b.includes(proc_target_1))) b_has_1 = true;
          if (str_b.includes(target_2) || (proc_target_2 && str_b.includes(proc_target_2))) b_has_2 = true;
        }
        
        if ((a_has_1 && b_has_2) || (a_has_2 && b_has_1)) return true;
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
          
          if (city_obj.particulars) {
            let p_str = String(city_obj.particulars).toLowerCase();
            if (p_str.includes("agglomeration of") || p_str.includes("part of") || p_str.includes("suburb")) {
              city_obj.is_agglomeration = false;
              let match = p_str.match(/agglomeration of\s+([a-z\s]+)/) || p_str.match(/part of\s+([a-z\s]+)/) || p_str.match(/suburb of\s+([a-z\s]+)/);
              if (match && match[1]) city_obj.is_agglomeration_of = processCityName(match[1]);
            } else if (p_str.includes("agglomeration") || p_str.includes("greater")) {
              city_obj.is_agglomeration = true;
              if (!city_obj.is_agglomeration_of) {
                if (city_obj.name) city_obj.is_agglomeration_of = processCityName(city_obj.name);
              }
            }
          }
          
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
      
      // Fast path: Bypasses spatial deduplication entirely for the base databank to save processing time
      if (i === 0) {
        console.log(`- (!CM): Fast-adding base database: ${all_options_keys[i]} (${all_local_cities.length} cities)`);
        for (let x = 0; x < all_local_cities.length; x++) {
          let local_city = local_db.data[all_local_cities[x]];
          local_city.type = all_options_keys[i];
          return_obj[all_local_cities[x]] = local_city;
          addToGrid(local_city);
        }
        continue;
      }
      
      //Iterate over local cities and merge against return_obj
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
        
        if (local_city.coords) {
          let search_radius = Math.max(local_db.precision || 0, local_db.semantic_precision || 0, max_explicit_precision);
          let cells_to_check = getGridCells(local_city.coords, search_radius + 0.5);
          
          let candidate_keys = new Set();
          for (let c = 0; c < cells_to_check.length; c++) {
            let keys_in_cell = city_grid.get(cells_to_check[c]);
            if (keys_in_cell) keys_in_cell.forEach(k => candidate_keys.add(k));
          }
          
          let candidate_array = Array.from(candidate_keys);
          
          let best_match = undefined;
          let best_score = -Infinity;
          
          for (var y = 0; y < candidate_array.length; y++) {
            var local_uud_city = return_obj[candidate_array[y]];
            if (local_uud_city && local_uud_city.coords) {
              if (isCannotBeMerged(local_uud_city, local_city)) continue;
              
              var local_distance = getCoordsDistance(local_uud_city.coords, local_city.coords);
              var same_agg = (isAgglomeration(local_uud_city) === isAgglomeration(local_city));
              
              if (!same_agg) {
                if (local_distance <= (local_db.precision || max_explicit_precision)) {
                  let city_proper = isAgglomeration(local_uud_city) ? local_city : local_uud_city;
                  let agg_city = isAgglomeration(local_uud_city) ? local_uud_city : local_city;
                  if (!city_proper.is_agglomeration_of)
                    city_proper.is_agglomeration_of = agg_city.is_agglomeration_of || processCityName(agg_city.name);
                }
                continue;
              }
              
              let is_exact_name = checkExactNameMatch(local_uud_city, local_city);
              let pop_check = isPopulationRatioValid(local_uud_city.population, local_city.population);
              
              let is_match = false;
              
              // Forced merge override - guarded by pop_check so Hoboken != NY
              if (local_distance < 0.01) {
                if (pop_check.valid) is_match = true;
              }
              // Exact name proximity merge
              else if (is_exact_name && local_distance <= search_radius) {
                if (pop_check.valid) is_match = true;
              }
              // Standard precision check
              else if (local_db.precision && local_distance <= local_db.precision) {
                if (pop_check.valid) {
                  // GUARD: Prevent wildly different names with zero temporal overlap from merging
                  // just because they are geographically close (e.g. Sumer & Azamiyah).
                  if (is_exact_name || pop_check.overlaps) {
                    is_match = true;
                  }
                }
              }
              
              // Rank matches: favors exact names, proximity, and crucially forces ancient entries to inherit the dominant anchor city (Log10 peak)
              if (is_match) {
                let score = 0;
                if (is_exact_name) score += 10000;
                if (local_distance < 0.01) score += 5000;
                score += (1.0 - (local_distance / Math.max(0.01, search_radius))) * 1000;
                
                let peak = getPeakPopulation(local_uud_city.population);
                score += (peak / 100);
                
                if (score > best_score) {
                  best_score = score;
                  best_match = local_uud_city;
                }
              }
            }
          }
          
          if (best_match) {
            let actual_dist = getCoordsDistance(best_match.coords, local_city.coords);
            console.log(`- (!CM): Selected best proxy match (${best_match.name} - ${local_city.name}), dist: ${actual_dist.toFixed(3)}, score: ${best_score.toFixed(2)}`);
            was_merged = [true, best_match];
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
              if (isCannotBeMerged(local_uud_city, local_city)) continue;
              
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
              let pop_check = isPopulationRatioValid(local_city.population, closest_uud_city_match[1].population);
              
              if (pop_check.valid) {
                console.log(`- (!CM): Semantic merge match found: ${local_city.name}, ${closest_uud_city_match[1].name}, distance: ${closest_uud_city_match[0]}`);
                was_merged = [true, closest_uud_city_match[1]];
              }
            }
          } catch (e) { console.error(e); }
        }
        
        if (!was_merged[0] && return_obj[all_local_cities[x]]) {
          let direct_match = return_obj[all_local_cities[x]];
          if (isAgglomeration(direct_match) === isAgglomeration(local_city) && !isCannotBeMerged(direct_match, local_city))
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
          addToGrid(local_city); // Assign unique additions to our spatial hashing map
        }
      }
    }
    
    //1.5 Post-deduplication pass preserving agglomeration vs city proper separation
    console.time(`- Deduplicating raw UUD entries...`);
    let deduplicate_keys = Object.keys(return_obj);
    let deleted_keys = new Set();
    
    for (let i = 0; i < deduplicate_keys.length; i++) {
      let city_a_key = deduplicate_keys[i];
      if (deleted_keys.has(city_a_key)) continue;
      
      let city_a = return_obj[city_a_key];
      if (!city_a || !city_a.coords) continue;
      
      let cells_to_check = getGridCells(city_a.coords, max_explicit_precision + 0.5);
      let cand_keys = new Set();
      for (let c = 0; c < cells_to_check.length; c++) {
        let keys_in_cell = city_grid.get(cells_to_check[c]);
        if (keys_in_cell) keys_in_cell.forEach(k => cand_keys.add(k));
      }
      
      for (let city_b_key of cand_keys) {
        if (city_a_key === city_b_key) continue;
        if (deleted_keys.has(city_b_key)) continue;
        
        let city_b = return_obj[city_b_key];
        if (!city_b || !city_b.coords) continue;
        if (isCannotBeMerged(city_a, city_b)) continue;
        
        let is_exact_name = checkExactNameMatch(city_a, city_b);
        let dist = 1000;
        try { dist = getCoordsDistance(city_a.coords, city_b.coords); } catch (e) {}
        
        if (isAgglomeration(city_a) !== isAgglomeration(city_b)) {
          // FIX: Agglomerations and City Propers are strictly prohibited from merging together.
          if (dist <= max_explicit_precision) {
            let city_proper = isAgglomeration(city_a) ? city_b : city_a;
            let agg_city = isAgglomeration(city_a) ? city_a : city_b;
            if (!city_proper.is_agglomeration_of)
              city_proper.is_agglomeration_of = agg_city.is_agglomeration_of || processCityName(agg_city.name);
          }
          continue;
        }
        
        let should_merge = false;
        try {
          let pop_check = isPopulationRatioValid(city_a.population, city_b.population);
          
          if (dist < 0.01) {
            if (pop_check.valid) should_merge = true;
          } else if (dist <= max_explicit_precision) {
            if (is_exact_name && pop_check.valid) {
              should_merge = true;
            }
          }
        } catch (e) {
          console.error(e);
        }
        
        if (should_merge) {
          mergeCityEntries(city_a, city_b, false);
          deleted_keys.add(city_b_key);
          delete return_obj[city_b_key];
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
    // Convert from parameters
    var uud_obj = arg0_uud_obj;
    let options = (arg1_options) ? arg1_options : {};
    
    // Initialize options
    if (!options.mode) options.mode = "linear";
    
    let all_cities = Object.keys(uud_obj);
    
    // Determine valid target years for interpolation from config
    let target_years = [];
    for (let i = 0; i < config.uud.processing.hyde_years.length; i++) {
      let hyde_year = config.uud.processing.hyde_years[i];
      if (hyde_year >= config.uud.processing.uud_domain[0] && hyde_year <= config.uud.processing.uud_domain[1]) {
        target_years.push(hyde_year);
      }
    }
    
    // MAIN INTERPOLATION PASS: Batch process all missing target years per city
    console.log(`Interpolating for years:`, target_years);
    console.time(`- Processed UUD interpolations`);
    
    for (let i = 0; i < all_cities.length; i++) {
      try {
        let local_city = uud_obj[all_cities[i]];
        if (i % 1000 === 0 && i !== 0) console.log(`- ${i}/${all_cities.length} cities processed (mode: ${options.mode})`);
        
        let valid_keys = 0;
        
        if (local_city.population) {
          let all_population_keys = Object.keys(local_city.population);
          
          for (let x = 0; x < all_population_keys.length; x++) {
            let local_population = local_city.population[all_population_keys[x]];
            
            if (local_population > 0) valid_keys++;
          }
          
          // Ensure there are enough valid keys to interpolate
          if (valid_keys >= 2) {
            let missing_years = [];
            
            // Collect target years that do not exist yet on this specific city
            for (let y = 0; y < target_years.length; y++) {
              if (local_city.population[target_years[y]] === undefined) {
                missing_years.push(target_years[y]);
              }
            }
            
            // Run interpolation passing the array of missing years
            if (missing_years.length > 0) {
              if (options.mode === "cubic") {
                local_city.population = cubicSplineInterpolationObject(local_city.population, { years: missing_years });
              } else if (options.mode === "linear") {
                local_city.population = linearInterpolationObject(local_city.population, { years: missing_years });
              }
            }
          }
        }
      } catch (e) {
        console.error(`Error interpolating city ${all_cities[i]}:`, e);
      }
    }
    
    console.timeEnd(`- Processed UUD interpolations`);
    
    //Pad cities forward for metro-correction step
    for (let i = 0; i < all_cities.length; i++) {
      let city = uud_obj[all_cities[i]];
      
      if (city.population) {
        let pop_keys = Object.keys(city.population).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (pop_keys.length > 0) {
          let max_year = pop_keys[pop_keys.length - 1];
          let last_val = city.population[max_year];
          
          // FIX: Only pad forward if the city's last recorded data point is modern (e.g. >= 1975).
          // Otherwise, ancient/historical ruins will incorrectly persist into the 21st century.
          if (max_year >= 1975) {
            for (let j = 0; j < config.uud.processing.hyde_years.length; j++) {
              let hyde_year = config.uud.processing.hyde_years[j];
              if (hyde_year > max_year && hyde_year <= config.uud.processing.uud_domain[1]) {
                city.population[hyde_year] = last_val;
              }
            }
          }
        }
      }
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
    // Strip all parenthesis blocks to isolate the base semantic name completely
    name = name.replace(/\([^)]*\)/g, "");
    
    // Strip standalone semantic modifiers
    name = name.replace(/\bgreater\b/gi, "");
    name = name.replace(/\bagglomeration\b/gi, "");
    
    // Safety catch for empty brackets if they somehow slipped through
    name = name.replace(/\(\s*\)/g, "");
    
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
    uud_obj = interpolateUUD(uud_obj, options);
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