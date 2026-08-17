//Initialise functions
{
	global.distributeNegativeValuesAcrossMetros = function (arg0_stadester_obj) {
		var stadester_obj = arg0_stadester_obj;
		var all_cities = Object.keys(stadester_obj);
		
		// OPTIMIZATION: Build a reverse dictionary of metros to suburbs to avoid O(N) searching for every negative year
		var metro_to_suburbs = {};
		for (let i = 0; i < all_cities.length; i++) {
			let city = stadester_obj[all_cities[i]];
			if (city.metro_key && city.metro_key !== city.key) {
				if (!metro_to_suburbs[city.metro_key]) metro_to_suburbs[city.metro_key] = [];
				metro_to_suburbs[city.metro_key].push(city);
			}
		}
		
		for (let i = 0; i < all_cities.length; i++) {
			var city = stadester_obj[all_cities[i]];
			var pop = city.population || {};
			var negative_years = Object.keys(pop).filter(
				(year) => typeof pop[year] === "number" && pop[year] < 0
			);
			
			if (negative_years.length === 0) continue;
			
			for (let y = 0; y < negative_years.length; y++) {
				var year = negative_years[y];
				var negative_value = Math.abs(pop[year]);
				
				// Fast O(1) lookup of suburbs belonging to this metro
				var raw_suburbs = metro_to_suburbs[city.key] || [];
				var suburbs = raw_suburbs.filter(
					(c) =>
						c.population &&
						typeof c.population[year] === "number" &&
						c.population[year] > 0
				);
				
				var total_suburb_pop = suburbs.reduce(
					(sum, suburb) => sum + suburb.population[year],
					0
				);
				
				if (total_suburb_pop === 0) continue; // Can't distribute
				
				// Proportionally distribute negative value, capping at zero
				let distributed = 0;
				for (let s = 0; s < suburbs.length; s++) {
					let suburb = suburbs[s];
					let share = suburb.population[year] / total_suburb_pop;
					let to_subtract = share * negative_value;
					// Cap at zero
					if (suburb.population[year] - to_subtract < 0) {
						to_subtract = suburb.population[year];
					}
					suburb.population[year] -= to_subtract;
					distributed += to_subtract;
				}
				
				// Set the metro's population for that year to the remaining negative (as negative)
				let remaining_negative = negative_value - distributed;
				pop[year] = remaining_negative > 0 ? -remaining_negative : 0;
			}
		}
		
		return stadester_obj;
	};
	
	global.flattenStadesterMetros = function (arg0_do_not_flatten_metros) {
		//Convert from parameters
		var do_not_flatten_metros = arg0_do_not_flatten_metros;
		
		//Declare local instance variables
		var stadester_obj = getStadesterObject();
		stadester_obj = removeStadesterDuplicates(stadester_obj);
		global.stadester_obj = stadester_obj;
		
		if (!do_not_flatten_metros) {
			var all_cities = Object.keys(stadester_obj);
			
			// OPTIMIZATION: Setup spatial context and precompute name arrays
			// ~250km limit is about 2.25 degrees. A 2.5 degree grid cell guarantees local bounding box overlaps
			let context = {
				agg_grid: new Map(),
				CELL_SIZE: 2.5,
				getGridCell: function(coords) {
					return `${Math.floor(coords[0] / this.CELL_SIZE)},${Math.floor(coords[1] / this.CELL_SIZE)}`;
				},
				getAdjacentCells: function(coords) {
					let x = Math.floor(coords[0] / this.CELL_SIZE);
					let y = Math.floor(coords[1] / this.CELL_SIZE);
					let cells = [];
					for(let dx = -1; dx <= 1; dx++) {
						for(let dy = -1; dy <= 1; dy++) {
							cells.push(`${x + dx},${y + dy}`);
						}
					}
					return cells;
				}
			};
			
			console.log(`- Precomputing spatial grids and name caches...`);
			for (let i = 0; i < all_cities.length; i++) {
				let city = stadester_obj[all_cities[i]];
				
				// Cache processed string names to skip evaluating Regex hundreds of thousands of times
				let n = [];
				if (city.name) n.push(processCityName(city.name));
				if (city.is_agglomeration_of) n.push(processCityName(city.is_agglomeration_of));
				if (Array.isArray(city.other_names)) {
					for (let k = 0; k < city.other_names.length; k++) n.push(processCityName(city.other_names[k]));
				}
				if (Array.isArray(city.original_names)) {
					for (let k = 0; k < city.original_names.length; k++) n.push(processCityName(city.original_names[k]));
				}
				city._cached_names = [...new Set(n.filter(x => x))];
				
				let is_agg = city.is_agglomeration || (city.name && (city.name.toLowerCase().includes("agglomeration") || city.name.toLowerCase().includes("greater")));
				
				if (is_agg && city.coords) {
					let cell = context.getGridCell(city.coords);
					if (!context.agg_grid.has(cell)) context.agg_grid.set(cell, []);
					context.agg_grid.get(cell).push(city);
				}
			}
			
			console.log(`- Resolving and flattening overlapping metro populations...`);
			let subtractions_made = 0;
			
			for (let i = 0; i < all_cities.length; i++) {
				var local_city = stadester_obj[all_cities[i]];
				var metro_obj = getStadesterMetroObject(local_city, context);
				if (metro_obj) {
					metro_obj = stadester_obj[metro_obj.key];
					if (metro_obj.key == local_city.key) continue; //Internal guard clause for self-intersections
				}
				
				//Subtract overlapping .population values in local_city from metro_obj.population
				if (metro_obj) {
					var all_local_population_keys = Object.keys(local_city.population);
					let matched_a_year = false;
					
					for (let x = 0; x < all_local_population_keys.length; x++) {
						let year = all_local_population_keys[x];
						
						// Enforce explicit float parsing to prevent JS Type Coercion issues during subtraction
						let agg_pop = parseFloat(metro_obj.population[year]);
						let city_pop = parseFloat(local_city.population[year]);
						
						if (!isNaN(agg_pop) && !isNaN(city_pop)) {
							local_city.metro_key = metro_obj.key;
							metro_obj.population[year] = agg_pop - city_pop;
							matched_a_year = true;
							
							// FIX: Cap at zero to prevent the agglomeration population from turning negative.
							// This stops distributeNegativeValuesAcrossMetros from mistakenly zeroing out the city proper later on.
							if (metro_obj.population[year] < 0) {
								metro_obj.population[year] = 0;
							}
						}
					}
					
					if (matched_a_year) subtractions_made++;
				}
			}
			console.log(`- Flattened populations for ${subtractions_made} cities against their agglomerations.`);
			
			//Distribute excess negative values across metros 
			//(Though we cap at 0 above, this remains as a safety harness for other datasets injecting negative values)
			stadester_obj = distributeNegativeValuesAcrossMetros(stadester_obj);
			
			// Cleanup cache memory before serialization and strip redundant successive population entries
			for (let i = 0; i < all_cities.length; i++) {
				let city = stadester_obj[all_cities[i]];
				delete city._cached_names;
				
				if (city.population) {
					let keys = Object.keys(city.population).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
					let to_delete = [];
					for (let k = 1; k < keys.length - 1; k++) {
						let prev = city.population[keys[k-1]];
						let curr = city.population[keys[k]];
						let next = city.population[keys[k+1]];
						
						if (prev === curr && curr === next) {
							to_delete.push(keys[k]);
						}
					}
					for (let k = 0; k < to_delete.length; k++) {
						delete city.population[to_delete[k]];
					}
				}
			}
		} else {
			console.log(`- Chose not to flatten Stadestér metros.`);
		}
		
		//Save file as flattened_stadester_cities.json
		console.log(`Saved raw metro-adjusted Stadestér dump.`);
		FileManager.saveFileAsJSON(config.defines.common.input_file_paths.flattened_stadester_cities, stadester_obj);
		
		//Return statement
		return stadester_obj;
	};
	
	global.getStadesterBestCityMatch = function (city_obj, candidate_cities) {
		// Levenshtein distance helper
		function levenshtein(a, b) {
			let matrix = Array.from({ length: a.length + 1 }, () =>
				Array(b.length + 1).fill(0)
			);
			for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
			for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
			for (let i = 1; i <= a.length; i++) {
				for (let j = 1; j <= b.length; j++) {
					if (a[i - 1] === b[j - 1]) {
						matrix[i][j] = matrix[i - 1][j - 1];
					} else {
						matrix[i][j] =
							1 +
							Math.min(
								matrix[i - 1][j], // deletion
								matrix[i][j - 1], // insertion
								matrix[i - 1][j - 1] // substitution
							);
					}
				}
			}
			return matrix[a.length][b.length];
		}
		
		// Scoring function
		function cityNameScore(input, candidate) {
			if (input === candidate) return 3;
			if (
				candidate.toLowerCase().includes(input.toLowerCase()) ||
				input.toLowerCase().includes(candidate.toLowerCase())
			)
				return 2;
			let lev = levenshtein(input.toLowerCase(), candidate.toLowerCase());
			return 1 / (1 + lev);
		}
		
		// Main logic
		let bestScore = -Infinity;
		let bestCity = null;
		
		for (let i = 0; i < candidate_cities.length; i++) {
			let local_city_names = [candidate_cities[i].name];
			if (candidate_cities[i].other_names)
				local_city_names = local_city_names.concat(
					candidate_cities[i].other_names
				);
			
			for (let candidateName of local_city_names) {
				let score = cityNameScore(city_obj.name, candidateName);
				if (score > bestScore) {
					bestScore = score;
					bestCity = candidate_cities[i];
				}
				if (score === 3) return bestCity; // Early exit for perfect match
			}
		}
		return bestCity;
	};
	
	global.getStadesterMetroObject = function (arg0_city_obj, arg1_context) {
		//Convert from parameters
		var city_obj = arg0_city_obj;
		var context = arg1_context;
		if (!city_obj) return;
		
		//If city_obj is itself an agglomeration, it has no parent metro above it
		if (city_obj.name && (city_obj.name.toLowerCase().includes("agglomeration") || city_obj.name.toLowerCase().includes("greater") || city_obj.is_agglomeration)) return;
		
		//Declare local instance variables
		var candidate_cities = [];
		
		function getAllNames(c) {
			let n = [];
			if (c.name) n.push(processCityName(c.name));
			if (c.is_agglomeration_of) n.push(processCityName(c.is_agglomeration_of));
			if (Array.isArray(c.other_names)) {
				for (let k = 0; k < c.other_names.length; k++)
					n.push(processCityName(c.other_names[k]));
			}
			if (Array.isArray(c.original_names)) {
				for (let k = 0; k < c.original_names.length; k++)
					n.push(processCityName(c.original_names[k]));
			}
			return n;
		}
		
		let city_names = city_obj._cached_names || getAllNames(city_obj);
		
		// OPTIMIZATION: Fast path utilising injected spatial context grid
		if (context && context.agg_grid && city_obj.coords) {
			let cells = context.getAdjacentCells(city_obj.coords);
			
			for (let c = 0; c < cells.length; c++) {
				let cell_aggs = context.agg_grid.get(cells[c]);
				if (cell_aggs) {
					for (let a = 0; a < cell_aggs.length; a++) {
						let local_city = cell_aggs[a];
						if (local_city.key === city_obj.key) continue;
						
						try {
							if (haversineDistance(local_city.coords, city_obj.coords) <= 250) {
								let cand_names = local_city._cached_names || getAllNames(local_city);
								let matched = false;
								
								for (let x = 0; x < city_names.length; x++) {
									for (let y = 0; y < cand_names.length; y++) {
										if (city_names[x] && cand_names[y] && (city_names[x] === cand_names[y] || cand_names[y].includes(city_names[x]) || city_names[x].includes(cand_names[y]))) {
											matched = true;
											break;
										}
									}
									if (matched) break;
								}
								
								if (matched)
									candidate_cities.push(local_city);
							}
						} catch (e) {
							console.error(`Error when iterating for city:`, local_city.key, e);
						}
					}
				}
			}
		} else {
			// Fallback: Default slow O(N) evaluation
			var stadester_obj = getStadesterObject();
			var all_cities = Object.keys(stadester_obj);
			
			//Iterate over all_cities looking for an agglomeration parent within 250km
			for (let i = 0; i < all_cities.length; i++) {
				var local_city = stadester_obj[all_cities[i]];
				if (local_city.key === city_obj.key) continue;
				
				var is_cand_agg = local_city.is_agglomeration || (local_city.name && (local_city.name.toLowerCase().includes("agglomeration") || local_city.name.toLowerCase().includes("greater")));
				if (!is_cand_agg) continue;
				
				try {
					if (haversineDistance(local_city.coords, city_obj.coords) <= 250) {
						let cand_names = getAllNames(local_city);
						let matched = false;
						
						for (let x = 0; x < city_names.length; x++) {
							for (let y = 0; y < cand_names.length; y++) {
								if (city_names[x] && cand_names[y] && (city_names[x] === cand_names[y] || cand_names[y].includes(city_names[x]) || city_names[x].includes(cand_names[y]))) {
									matched = true;
									break;
								}
							}
							if (matched) break;
						}
						
						if (matched)
							candidate_cities.push(local_city);
					}
				} catch (e) {
					console.error(`Error when iterating for city:`, all_cities[i], e);
				}
			}
		}
		
		if (candidate_cities.length === 0) return;
		
		//Return statement
		let base_name = city_obj.is_agglomeration_of || city_obj.name;
		return getStadesterBestCityMatch({ name: base_name }, candidate_cities);
	};
	
	global.getStadesterObject = function () {
		//Return statement
		return (global.stadester_obj) ?
			global.stadester_obj : JSON.parse(fs.readFileSync(config.defines.common.input_file_paths.stadester_cities));
	};
	
	global.parseUUDToStadester = function () {
		//Declare local instance variables
		var return_obj = {};
		var uud_obj = JSON.parse(fs.readFileSync(config.defines.common.input_file_paths.processed_uud_cities));
		
		//Iterate over all city keys in flat UUD
		var all_cities = Object.keys(uud_obj);
		
		for (let i = 0; i < all_cities.length; i++) {
			var local_city = uud_obj[all_cities[i]];
			
			//Set country name
			if (!local_city.country) {
				var country_name = null;
				
				if (local_city.region) {
					country_name = local_city.region;
				} else if (local_city.country) {
					country_name = local_city.country;
				} else {
					var split_key = all_cities[i].split("-");
					country_name = split_key[split_key.length - 1];
				}
				local_city.country = country_name;
			}
			
			//Clean up coords, set .key
			if (local_city.coords != undefined)
				local_city.coords = [
					parseFloat(local_city.coords[0]),
					parseFloat(local_city.coords[1])
				];
			
			local_city.key = all_cities[i];
			if (!local_city.name) local_city.name = all_cities[i];
			
			if (local_city.name && (local_city.name.toLowerCase().includes("agglomeration") || local_city.name.toLowerCase().includes("greater")) && !local_city.is_agglomeration_of)
				local_city.is_agglomeration_of = processCityName(local_city.name);
			
			//Check to make sure name doesn't have a colon in it
			if (local_city.name && local_city.name.includes(":")) continue;
			
			//Assign to return_obj
			return_obj[all_cities[i]] = local_city;
		}
		
		//Save file as stadester_cities.json; global.stadester_obj
		console.log(`Saved raw flattened Stadestér dump.`);
		FileManager.saveFileAsJSON(config.defines.common.input_file_paths.stadester_cities, return_obj);
		global.stadester_obj = return_obj;
		
		//Return statement
		return return_obj;
	};
	
	//[WIP] - Refactor at a later date
	global.removeStadesterDuplicates = function (stadester_obj) {
		let grouped = {};
		
		// Group by rounded coords (0.1 deg threshold) AND agglomeration status
		for (let key in stadester_obj) {
			let city = stadester_obj[key];
			if (!city || !Array.isArray(city.coords) || city.coords.length < 2) continue;
			let lat = Number(city.coords[0]).toFixed(3);
			let lng = Number(city.coords[1]).toFixed(3);
			
			// FIX: Prevent city proper and agglomerations from being grouped simply because they share identical coordinates.
			let is_agg = (city.is_agglomeration || (city.name && (city.name.toLowerCase().includes("agglomeration") || city.name.toLowerCase().includes("greater")))) ? "agg" : "city";
			let groupKey = `${lat},${lng},${is_agg}`;
			
			if (!grouped[groupKey]) grouped[groupKey] = [];
			grouped[groupKey].push({ key, city });
		}
		
		let result = {};
		
		for (let groupKey in grouped) {
			let group = grouped[groupKey];
			
			// Find the city with the most population years (highest data fidelity)
			group.sort((a, b) => {
				let numYears = obj =>
					obj && obj.city && obj.city.population
						? Object.keys(obj.city.population).length
						: 0;
				return numYears(b) - numYears(a);
			});
			
			let best = group[0].city;
			if (!best || !best.population) continue;
			
			// Merge all population keys from all cities in the group into the best
			for (let i = 1; i < group.length; i++) {
				let duplicate = group[i].city;
				if (!duplicate || !duplicate.population) continue;
				for (let popKey in duplicate.population) {
					if (!best.population.hasOwnProperty(popKey)) {
						best.population[popKey] = duplicate.population[popKey];
					}
				}
			}
			
			// Only keep the best city's key
			result[group[0].key] = best;
		}
		
		return result;
	};
}