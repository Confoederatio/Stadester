//Initialise functions
{
	global.distributeNegativeValuesAcrossMetros = function (arg0_stadester_obj) {
		var stadester_obj = arg0_stadester_obj;
		var all_cities = Object.keys(stadester_obj);
		
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
				
				// Find suburbs (other cities with .metro_key === city.key, but not the city itself)
				var suburbs = all_cities
				.filter((k) => k !== city.key) // Exclude the metro itself
				.map((k) => stadester_obj[k])
				.filter(
					(c) =>
						c.metro_key === city.key &&
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
			//Iterate over all_cities in stadester_obj
			var all_cities = Object.keys(stadester_obj);
			
			for (let i = 0; i < all_cities.length; i++) {
				var local_city = stadester_obj[all_cities[i]];
				var metro_obj = getStadesterMetroObject(local_city);
				if (metro_obj) {
					metro_obj = stadester_obj[metro_obj.key];
					if (metro_obj.key == local_city.key) continue; //Internal guard clause for self-intersections
				}
				
				//Subtract overlapping .population values in local_city from metro_obj.population
				if (metro_obj) {
					var all_local_population_keys = Object.keys(local_city.population);
					
					for (let x = 0; x < all_local_population_keys.length; x++)
						if (
							!isNaN(metro_obj.population[all_local_population_keys[x]]) &&
							!isNaN(local_city.population[all_local_population_keys[x]])
						) {
							local_city.metro_key = metro_obj.key;
							metro_obj.population[all_local_population_keys[x]] -= local_city.population[all_local_population_keys[x]];
						}
				}
			}
			
			//Distribute excess negative values across metros
			stadester_obj = distributeNegativeValuesAcrossMetros(stadester_obj);
		} else {
			console.log(`- Chose not to flatten Stadestér metros.`);
		}
		
		//Save file as flattened_stadester_cities.json
		console.log(`Saved raw metro-adjusted Stadestér dump.`);
		FileManager.saveFileAsJSON(config.defines.common.input_file_paths.flattened_stadester_cities, stadester_obj);
		
		//Return statement
		return stadester_obj;
	};
	
	global.getStadesterMetroObject = function (arg0_city_obj) {
		//Convert from parameters
		var city_obj = arg0_city_obj;
		if (!city_obj) return;
		
		//If city_obj is itself an agglomeration, it has no parent metro above it
		if (city_obj.name && city_obj.name.toLowerCase().includes("agglomeration")) return;
		
		//Declare local instance variables
		var stadester_obj = getStadesterObject();
		var all_cities = Object.keys(stadester_obj);
		var candidate_cities = [];
		var base_city_name = city_obj.name.toLowerCase().replace(/\(agglomeration\)/i, "").trim();
		
		//Iterate over all_cities looking for an agglomeration parent within 250km
		for (let i = 0; i < all_cities.length; i++) {
			var local_city = stadester_obj[all_cities[i]];
			if (local_city.key === city_obj.key) continue;
			
			var is_cand_agg = (local_city.name && local_city.name.toLowerCase().includes("agglomeration")) || local_city.is_agglomeration_of;
			if (!is_cand_agg) continue;
			
			try {
				if (haversineDistance(local_city.coords, city_obj.coords) <= 250) {
					let cand_base_name = local_city.is_agglomeration_of ? local_city.is_agglomeration_of.toLowerCase().trim() : local_city.name.toLowerCase().replace(/\(agglomeration\)/i, "").trim();
					
					if (cand_base_name === base_city_name || local_city.name.toLowerCase().includes(base_city_name))
						candidate_cities.push(local_city);
				}
			} catch (e) {
				console.error(`Error when iterating for city:`, all_cities[i], e);
			}
		}
		
		if (candidate_cities.length === 0) return;
		
		//Return statement
		return getStadesterBestCityMatch({ name: base_city_name }, candidate_cities);
	};
	
	global.getStadesterObject = function () {
		//Return statement
		return (global.stadester_obj) ?
			global.stadester_obj : JSON.parse(fs.readFileSync(config.defines.common.input_file_paths.stadester_cities));
	}
	
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
			
			if (local_city.name && local_city.name.toLowerCase().includes("agglomeration") && !local_city.is_agglomeration_of)
				local_city.is_agglomeration_of = local_city.name.replace(/\(agglomeration\)/i, "").trim();
			
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
		const grouped = {};
		
		// Group by rounded coords (0.1 deg threshold)
		for (const key in stadester_obj) {
			const city = stadester_obj[key];
			if (!city || !Array.isArray(city.coords) || city.coords.length < 2) continue;
			const lat = Number(city.coords[0]).toFixed(3);
			const lng = Number(city.coords[1]).toFixed(3);
			const groupKey = `${lat},${lng}`;
			if (!grouped[groupKey]) grouped[groupKey] = [];
			grouped[groupKey].push({ key, city });
		}
		
		const result = {};
		
		for (const groupKey in grouped) {
			const group = grouped[groupKey];
			
			// Find the city with the most population years (highest data fidelity)
			group.sort((a, b) => {
				const numYears = obj =>
					obj && obj.city && obj.city.population
						? Object.keys(obj.city.population).length
						: 0;
				return numYears(b) - numYears(a);
			});
			
			const best = group[0].city;
			if (!best || !best.population) continue;
			
			// Merge all population keys from all cities in the group into the best
			for (let i = 1; i < group.length; i++) {
				const duplicate = group[i].city;
				if (!duplicate || !duplicate.population) continue;
				for (const popKey in duplicate.population) {
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

//Internal helper functions - [WIP] - To be refactored later
{
	global.getStadesterBestCityMatch = function (city_obj, candidate_cities) {
		// Levenshtein distance helper
		function levenshtein(a, b) {
			const matrix = Array.from({ length: a.length + 1 }, () =>
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
			const lev = levenshtein(input.toLowerCase(), candidate.toLowerCase());
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
			
			for (const candidateName of local_city_names) {
				const score = cityNameScore(city_obj.name, candidateName);
				if (score > bestScore) {
					bestScore = score;
					bestCity = candidate_cities[i];
				}
				if (score === 3) return bestCity; // Early exit for perfect match
			}
		}
		return bestCity;
	};
}