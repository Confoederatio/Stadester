//Initialise functions
{
	global.fixStadesterErrors = function () {
		//Declare local instance variables
		var input_file_path = config.defines.common.input_file_paths.flattened_stadester_cities;
		var output_file_path = config.defines.common.input_file_paths.processed_stadester_cities;
		var stadester_obj = JSON.parse(fs.readFileSync(input_file_path, "utf8"));
		
		try {
			//Washington D.C. fix
			stadester_obj["Washington-United States"].coords = [38.906727075772245, -77.0366352170292];
			
			//Cardiff-Rhondda fix/swap
			var cardiff_population = JSON.parse(JSON.stringify(stadester_obj["Cardiff-United Kingdom"].population));
			var rhondda_population = JSON.parse(JSON.stringify(stadester_obj["Rhondda-United Kingdom"].population));
			
			stadester_obj["Cardiff-United Kingdom"].population = rhondda_population;
			stadester_obj["Rhondda-United Kingdom"].population = cardiff_population;
		} catch (e) { console.warn(e); }
		try {
			//Minneapolis duplicate fix
			delete stadester_obj["Minneapolis-United States of America"];
		} catch (e) { console.error(e); }
		try {
			//Iterate over all_stadester_keys; round .population figures
			var all_stadester_keys = Object.keys(stadester_obj);
			
			for (let i = 0; i < all_stadester_keys.length; i++) {
				var local_city = stadester_obj[all_stadester_keys[i]];
				
				if (local_city.population) {
					var all_population_keys = Object.keys(local_city.population);
					
					for (let x = 0; x < all_population_keys.length; x++) {
						var local_value = local_city.population[all_population_keys[x]];
						
						if (local_value < 0) local_value = 0; //[WIP] - Remove negatives for now
						local_city.population[all_population_keys[x]] = Math.round(local_value);
					}
				}
			}
		} catch (e) { console.error(e); }
		
		//Save stadester_obj
		FileManager.saveFileAsJSON(output_file_path, stadester_obj);
	};
	
	global.getFlattenedStadesterObject = function () {
		//Declare local instance variables
		var input_file_path = config.defines.common.input_file_paths.stadester_areas;
		global.stadester_obj = JSON.parse(fs.readFileSync(input_file_path, "utf8"));
		
		//Return statement
		return stadester_obj;
	};
	
	global.getProcessedStadesterObject = function () {
		//Declare local instance variables
		var input_file_path = config.defines.common.input_file_paths.processed_stadester_cities;
		global.stadester_obj = JSON.parse(fs.readFileSync(input_file_path, "utf8"));
		
		//Return statement
		return stadester_obj;
	};
}