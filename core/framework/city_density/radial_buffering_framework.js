//Initialise functions
{
	global.cacheRadialBuffers = function () {
		//Declare local instance variables
		let density_processing_obj = config.population_density.processing;
		let input_file_path = config.defines.common.input_file_paths.stadester_areas;
		let output_file_path = config.defines.common.input_file_paths.stadester_output;
		let stadester_obj = JSON.parse(fs.readFileSync(input_file_path, "utf8"));
		let walkability_ratio_obj = getWalkabilityRatioObject();
		
		//Iterate over all_cities and check if .area would be large enough at latitude to cover multiple gridcells. If not, skip it
		let all_cities = Object.keys(stadester_obj);
		
		for (let i = 0; i < all_cities.length; i++) {
			let local_city = stadester_obj[all_cities[i]];
			
			//Check to see if computing radial buffers are possible
			if (local_city.area && local_city.coords) {
				let all_area_keys = Object.keys(local_city.area).map(Number)
				.sort((a, b) => a - b);
				let time_domain = [all_area_keys[0], all_area_keys[all_area_keys.length - 1]];
				
				for (let x = time_domain[0]; x < time_domain[1]; x++)
					if (x >= density_processing_obj.baseline_year && x <= density_processing_obj.end_year)
						if (local_city.population[x]) {
							//Check if .area is large enough at latitude to be greater than 1 gridcell in size
							let pixel_size = Math.ceil(local_city.area[x]/getPixelAreaAtLatitude(local_city.coords[0]));
							
							if (pixel_size > 1) {
								try {
									if (!local_city.radial_buffers) local_city.radial_buffers = {};
									local_city.radial_buffers[x] = getCityPopulationByPixelRing(local_city, x, {
										walkability_ratio_obj: walkability_ratio_obj
									});
									
									//Make sure NaN's don't appear
									if (isNaN(local_city.radial_buffers[x][0])) {
										local_city.radial_buffers[x] = [returnSafeNumber(local_city.population[x])];
										continue;
									}
									
									console.log(`- Produced radial buffers for ${local_city.name} (${i}/${all_cities.length}) for ${x}:`, local_city.radial_buffers, ` | Pixel size: ${pixel_size}, Pixel size at latitude: ${getPixelAreaAtLatitude(local_city.coords[0])}, Actual area: ${local_city.area[x]}`);
								} catch (e) {
									console.error(`Error for ${local_city.name}:`, e);
								}
							} else {
								if (!local_city.radial_buffers) local_city.radial_buffers = {};
								local_city.radial_buffers[x] = [local_city.population[x]];
							}
						}
			}
		}
		
		console.log(`Saved radially-buffered Stadestér dump.`);
		FileManager.saveFileAsJSON(output_file_path, stadester_obj);
	};
	
	global.getCoordsPixel = function (arg0_coords) {
		//Convert from parameters
		var coords = arg0_coords;
		
		//Declare local instance variables
		var lat = coords[0];
		var lng = coords[1];
		
		lat = Math.max(-90, Math.min(90, lat));
		lng = ((lng + 180) % 360 + 360) % 360 - 180; // Wrap longitude to [-180, 180]
		
		const x = ((lng + 180) / 360) * 4320;
		const y = (1 - (lat + 90) / 180) * 2160;
		
		// Optionally round to nearest integer pixel
		return [Math.round(x), Math.round(y)];
	};
	
	/**
	 * getHYDEYearName() - Fetches the formal name of a HYDE year given a year integer.
	 * @param {number} arg0_year
	 *
	 * @returns {String}
	 */
	global.getHYDEYearName = function (arg0_year) {
		//Convert from parameters
		var year = parseInt(arg0_year);
		
		//Return statement
		return `${Math.abs(year)}${(year >= 0) ? "AD" : "BC"}`;
	};
	
	//2. Use imputed populations within gridcell radii to buffer population by scaling rings to target over substrata
	global.generateStadesterRasterForYear = function (arg0_year, arg1_options) { //[WIP] - Use GHS_POP instead after 1975
		//Convert from parameters
		let year = parseInt(arg0_year);
		let options = (arg1_options) ? arg1_options : {};
		
		if (!options.stadester_obj) options.stadester_obj = getStadesterBufferingObject();
		
		//Declare local instance variables
		let all_stadester_keys = Object.keys(options.stadester_obj);
		let common_defines = config.defines.common;
		let first_ghsl_year = config.ghsl.processing.years[0];
		let output_file_path = `${common_defines.output_file_paths.stadester_base_rasters_folder}/${common_defines.output_file_paths.stadester_base_rasters_prefix}${year}.png`;
		let pixel_dictionary = {};
		let pixel_obj = {};
		let substrata_file_path = `${common_defines.input_file_paths.substrata_folder}${common_defines.input_file_paths.substrata_prefix}${year}${common_defines.input_file_paths.substrata_suffix}`;
			if (year >= first_ghsl_year)
				substrata_file_path = `${common_defines.input_file_paths.ghsl_population_folder}${common_defines.input_file_paths.ghsl_population_prefix}${year}${common_defines.input_file_paths.ghsl_population_suffix}`;
		let substrata_raster = loadNumberRasterImage(substrata_file_path);
		
		//Iterate over all_stadester_keys and populate pixel_dictionary based on .coords and year
		for (let i = 0; i < all_stadester_keys.length; i++) try {
			let local_city = options.stadester_obj[all_stadester_keys[i]];
			let local_pixel = getCoordsPixel(local_city.coords);
			
			let all_population_keys = Object.keys(local_city.population).map(Number);
			let local_domain = [Math.min(...all_population_keys), Math.max(...all_population_keys)];
			
			if (!pixel_dictionary[local_pixel.join(",")])
				pixel_dictionary[local_pixel.join(",")] = [];
			
			//Check to make sure that population is within domain
			if (
				(year >= local_domain[0] && year <= local_domain[1]) ||
				(local_domain[1] >= 1975 && year >= 1975)
			)
				pixel_dictionary[local_pixel.join(",")].push(local_city);
		} catch (e) { console.error(`Error parsing ${all_stadester_keys[i]}:`, e); }
		
		//Iterate over all_pixel_keys in pixel_dictionary; populate pixel_obj
		let all_pixel_keys = Object.keys(pixel_dictionary);
		
		for (let i = 0; i < all_pixel_keys.length; i++) {
			let local_cities = pixel_dictionary[all_pixel_keys[i]];
				if (local_cities.length === 0) continue; //Internal guard clause if local_cities is empty
			
			//Iterate over all local_cities
			for (let x = 0; x < local_cities.length; x++) {
				let local_pixels = {};
				let local_radial_buffers = [];
				let local_sum_population = 0;
				
				//Iterate over all_population_keys; all_radial_buffer_keys
				if (local_cities[x].population) {
					let all_population_keys = Object.keys(local_cities[x].population).map(Number)
						.sort((a, b) => a - b);
					let last_population = 0;
					
					for (let y = 0; y < all_population_keys.length; y++)
						if (parseInt(all_population_keys[y]) <= year)
							last_population = local_cities[x].population[all_population_keys[y]];
					local_sum_population += last_population;
				}
				if (local_cities[x].radial_buffers) {
					let all_radial_buffer_keys = Object.keys(local_cities[x].radial_buffers);
					
					for (let y = 0; y < all_radial_buffer_keys.length; y++)
						if (parseInt(all_radial_buffer_keys[y]) <= year)
							local_radial_buffers = local_cities[x].radial_buffers[all_radial_buffer_keys[y]];
				}
				
				//Populate local_pixels
				if (local_radial_buffers.length > 0) {
					//console.log(`Local radial buffers for ${local_cities[x].name}: ${local_radial_buffers.length}`);
					if (local_radial_buffers.length === 1) {
						modifyValue(local_pixels, all_pixel_keys[i], local_sum_population);
					} else if (local_radial_buffers.length > 1) {
						local_pixels[all_pixel_keys[i]] = local_radial_buffers[0];
						
						for (let y = 1; y < local_radial_buffers.length; y++) {
							let annular_pixels = getPixelsInAnnulus(
								all_pixel_keys[i].split(",").map(Number), y);
							let annular_sum = 0;
							
							for (let z = 0; z < annular_pixels.length; z++) {
								let local_value = substrata_raster.data[annular_pixels[z][0]*substrata_raster.width + annular_pixels[z][1]];
								
								annular_sum += local_value;
							}
							if (annular_sum === 0) continue; //Internal guard clause if annular_sum is not applicable
							
							//Compute annular_scalar; push scaled annular pixels to local_pixels
							let annular_scalar = local_radial_buffers[y]/annular_sum;
							
							for (let z = 0; z < annular_pixels.length; z++) {
								let local_value = substrata_raster.data[annular_pixels[z][1]*substrata_raster.width + annular_pixels[z][0]];
								
								//Scale by annular_scalar;
								local_value *= annular_scalar;
								local_pixels[
									[annular_pixels[z][0], annular_pixels[z][1]].join(",")
								] = local_value;
							}
						}
					}
				} else {
					modifyValue(local_pixels, all_pixel_keys[i], local_sum_population);
				}
				//console.log(`- Local radial buffers:`, local_radial_buffers, `local_sum_population:`, local_sum_population);
				
				//Push all_local_pixels to pixel_obj
				let all_local_pixels = Object.keys(local_pixels);
				let current_sum = 0;
				
				//Scale all_local_pixels to local_sum_population first
				for (let y = 0; y < all_local_pixels.length; y++)
					current_sum += local_pixels[all_local_pixels[y]];
				
				let current_scalar = returnSafeNumber(local_sum_population/current_sum, 1);
				//console.log(`${local_cities[x].name}: ${local_sum_population}/${current_sum} = ${current_scalar}`);
				
				//if (all_local_pixels.length > 0) console.log(`- Pixels defined for ${all_pixel_keys[i]}: ${all_local_pixels.length}`);
				for (let y = 0; y < all_local_pixels.length; y++) {
					let local_value = local_pixels[all_local_pixels[y]]*current_scalar;
					
					if (local_value >= 10000000) {
						console.warn(`- Warning! ${local_cities[x].name} has a pixel with a population of more than 10M!`);
						console.warn(` - Actual population:`, local_sum_population);
						console.warn(`- Current scalar:`, current_scalar);
						console.log(` - Using original local_value:`, local_value/current_scalar);
						console.log(`  - Radial buffers:`, local_radial_buffers);
						
						modifyValue(pixel_obj, all_local_pixels[y], local_value/current_scalar);
					} else {
						modifyValue(pixel_obj, all_local_pixels[y], local_value);
					}
				}
			}
		}
		
		//Save Stadester raster
		saveNumberRasterImage({
			file_path: output_file_path,
			height: 2160,
			width: 4320,
			
			function: function (arg0_index) {
				//Convert from parameters
				var index = arg0_index;
				
				//Declare local instance variables
				var pixel = [index % 4320, Math.floor(index/4320)];
				
				//Check if pixel_obj has a valid entry
				if (pixel_obj[pixel.join(",")])
					//Return statement
					return pixel_obj[pixel.join(",")];
				return 0;
			}
		});
		console.log(`- Saved Stadestér raster for ${year} to ${output_file_path}.`);
		console.log(` - Pixel dictionary length:`, Object.keys(pixel_dictionary).length);
		console.log(` - Pixel object keys:`, Object.keys(pixel_obj));
		console.log(` - Urban Population: ${parseNumber(getImageSum(output_file_path))}`);
	};
	
	global.generateOriginalStadesterRasters = function () {
		//Declare local instance variables
		var hyde_years = config.uud.processing.hyde_years.concat([2024, 2025]);
		var stadester_buffering_obj = getStadesterBufferingObject();
		var uud_domain = config.uud.processing.uud_domain;
		
		for (let i = 0; i < hyde_years.length; i++)
			if (hyde_years[i] >= uud_domain[0] && hyde_years[i] <= uud_domain[1])
				generateStadesterRasterForYear(hyde_years[i], { stadester_obj: stadester_buffering_obj });
	};
	
	global.getPixelsInAnnulus = function (arg0_pixel, arg1_distance) {
		const [cx, cy] = arg0_pixel;
		const r = parseInt(arg1_distance);
		
		// You can adjust thickness here (0.5 gives a 1-pixel thick ring)
		const rMin = (r - 0.5) * (r - 0.5);
		const rMax = (r + 0.5) * (r + 0.5);
		
		const pixels = [];
		for (let dx = -r - 1; dx <= r + 1; dx++) {
			for (let dy = -r - 1; dy <= r + 1; dy++) {
				const distSq = dx * dx + dy * dy;
				if (distSq > rMin && distSq <= rMax) {
					pixels.push([cx + dx, cy + dy]);
				}
			}
		}
		return pixels;
	};
	
	global.getPixelsInRadius = function (arg0_pixel, arg1_radius) {
		const [cx, cy] = arg0_pixel;
		const r = arg1_radius;
		const pixels = [];
		
		// Bounding box for the circle
		for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
			for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
				const dx = x - cx;
				const dy = y - cy;
				if (dx * dx + dy * dy <= r * r) {
					pixels.push([x, y]);
				}
			}
		}
		return pixels;
	};
	
	global.getStadesterBufferingObject = function () {
		//Return statement
		return FileManager.loadFileAsJSON(config.defines.common.input_file_paths.stadester_output);
	};
	
	//3. End process function
	global.processStadester = function () {
		//Declare local instance variables
		var common_defines = config.defines.common;
		var copy_operations = []; //[[input_file_path, output_file_path]];
		var ghsl_folder = common_defines.output_file_paths.ghsl_urban_folder;
		var stadester_base_folder = common_defines.output_file_paths.stadester_base_rasters_folder;
		
		var all_ghsl_files = fs.readdirSync(ghsl_folder)
			.filter((file) => path.extname(file).toLowerCase() == ".png");
		var all_stadester_files = fs.readdirSync(stadester_base_folder)
			.filter((file) => path.extname(file).toLowerCase() == ".png");
		
		//Iterate over all_stadester_files
		for (let i = 0; i < all_stadester_files.length; i++) {
			let local_split_file_name = all_stadester_files[i].split("_");
				local_split_file_name[local_split_file_name.length - 1].replace(".png", "");
			let local_year = parseInt(local_split_file_name[local_split_file_name.length - 1]);
			
			copy_operations.push([
				`${stadester_base_folder}${all_stadester_files[i]}`,
				`${common_defines.output_file_paths.stadester_ghsl_rasters_folder}${common_defines.output_file_paths.stadester_ghsl_rasters_prefix}${local_year}.png`
			]);
		}
		
		//Iterate over all_ghsl_files
		for (let i = 0; i < all_ghsl_files.length; i++) {
			let local_split_file_name = all_ghsl_files[i].split("_");
				local_split_file_name[local_split_file_name.length - 1].replace(".png", "");
			let local_year = parseInt(local_split_file_name[local_split_file_name.length - 1]);
			
			copy_operations.push([
				`${ghsl_folder}${all_ghsl_files[i]}`,
				`${common_defines.output_file_paths.stadester_ghsl_rasters_folder}${common_defines.output_file_paths.stadester_ghsl_rasters_prefix}${local_year}.png`
			]);
		}
		
		console.log(`- Merge operations (copy_operations):`, copy_operations);
		
		//Iterate over all copy_operations and copy each file synchronously
		for (let i = 0; i < copy_operations.length; i++) {
			console.log(` - Copying ${copy_operations[i][0]} to ${copy_operations[i][1]}`);
			fs.copyFileSync(copy_operations[i][0], copy_operations[i][1]);
		}
	};
}