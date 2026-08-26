//Initialise functions
{
	global.generateStadesterPopulationRasters = function () {
		//Declare local instance variables
		let common_defines = config.defines.common;
		let first_ghsl_year = config.ghsl.processing.years[0];
		let stadester_years = config.uud.processing.stadester_years;
		let world_pop_obj = getWorldPopulationObject();
		
		for (let i = 0; i < stadester_years.length; i++) {
			let local_population_file_path = `${common_defines.output_file_paths.stadester_population_rasters_folder}${common_defines.output_file_paths.stadester_population_rasters_prefix}${stadester_years[i]}.png`;
			let local_rural_file_path = `${common_defines.output_file_paths.stadester_rural_rasters_folder}${common_defines.output_file_paths.stadester_rural_rasters_prefix}${stadester_years[i]}.png`;
			let local_urban_file_path = `${common_defines.output_file_paths.stadester_urban_rasters_folder}${common_defines.output_file_paths.stadester_urban_rasters_prefix}${stadester_years[i]}.png`;
			
			let local_urban_raster;
			if (fs.existsSync(local_urban_file_path)) local_urban_raster = loadNumberRasterImage(local_urban_file_path);
			
			//1. Prior to first_ghsl_year, sum stadester_rural and stadester_urban pixels, scale, then regenerate rural
			if (stadester_years[i] < first_ghsl_year) {
				let local_rural_raster;
				if (fs.existsSync(local_rural_file_path)) local_rural_raster = loadNumberRasterImage(local_rural_file_path);
				
				//Save baseline population raster image
				saveNumberRasterImage({
					file_path: local_population_file_path,
					height: 2160,
					width: 4320,
					
					function: function (arg0_index) {
						let index = arg0_index;
						let local_rural_population = (local_rural_raster && local_rural_raster.data[index]) ? local_rural_raster.data[index] : 0;
						let local_urban_population = (local_urban_raster && local_urban_raster.data[index]) ? local_urban_raster.data[index] : 0;
						
						return local_rural_population + local_urban_population;
					}
				});
				
				//Scale population raster to global target population
				if (world_pop_obj[stadester_years[i]]) {
					let current_population = getImageSum(local_population_file_path);
					let target_population = world_pop_obj[stadester_years[i]];
					
					let local_scalar = target_population/current_population;
					let local_raster = loadNumberRasterImage(local_population_file_path);
					
					saveNumberRasterImage({
						file_path: local_population_file_path,
						height: 2160,
						width: 4320,
						
						function: function (arg0_index) {
							let index = arg0_index;
							if (local_raster.data[index]) return Math.ceil(local_raster.data[index]*local_scalar);
							return 0;
						}
					});
					console.log(` - Scalar: ${local_scalar}, Current Population: ${parseNumber(current_population)} | Target Population: ${parseNumber(target_population)}`);
				}
				
				//Regenerate rural raster as Total Population - Urban Population after scaling
				let local_pop_raster = loadNumberRasterImage(local_population_file_path);
				
				saveNumberRasterImage({
					file_path: local_rural_file_path,
					height: 2160,
					width: 4320,
					
					function: function (arg0_index) {
						let index = arg0_index;
						let local_pop = (local_pop_raster && local_pop_raster.data[index]) ? local_pop_raster.data[index] : 0;
						let local_urban_pop = (local_urban_raster && local_urban_raster.data[index]) ? local_urban_raster.data[index] : 0;
						return Math.max(0, local_pop - local_urban_pop);
					}
				});
			}
			//2. From first_ghsl_year onwards, treat Urban as rigid baseline, and map GHSL as the remainder (Rural)
			else {
				let ghs_pop_file_path = `${common_defines.input_file_paths.ghsl_population_folder}${common_defines.input_file_paths.ghsl_population_prefix}${stadester_years[i]}${common_defines.input_file_paths.ghsl_population_suffix}`;
				let ghs_pop_raster = loadNumberRasterImage(ghs_pop_file_path);
				
				let target_population = world_pop_obj[stadester_years[i]];
				
				//Calculate global urban population to determine remaining rural budget
				let global_urban_pop = 0;
				if (local_urban_raster && local_urban_raster.data) {
					for (let j = 0; j < local_urban_raster.data.length; j++) {
						global_urban_pop += local_urban_raster.data[j];
					}
				}
				
				let target_rural_population = Math.max(0, target_population - global_urban_pop);
				
				//First pass: calculate raw rural sum from GHS_POP excluding established urban areas
				let raw_rural_sum = 0;
				let total_pixels = 2160 * 4320;
				for (let j = 0; j < total_pixels; j++) {
					let ghs_val = (ghs_pop_raster && ghs_pop_raster.data[j]) ? ghs_pop_raster.data[j] : 0;
					let urb_val = (local_urban_raster && local_urban_raster.data[j]) ? local_urban_raster.data[j] : 0;
					raw_rural_sum += Math.max(0, ghs_val - urb_val);
				}
				
				let rural_scalar = (raw_rural_sum > 0) ? (target_rural_population / raw_rural_sum) : 0;
				
				//Write Rural Raster: (GHS_POP - Urban) * rural_scalar
				saveNumberRasterImage({
					file_path: local_rural_file_path,
					height: 2160,
					width: 4320,
					
					function: function (arg0_index) {
						let index = arg0_index;
						let ghs_val = (ghs_pop_raster && ghs_pop_raster.data[index]) ? ghs_pop_raster.data[index] : 0;
						let urb_val = (local_urban_raster && local_urban_raster.data[index]) ? local_urban_raster.data[index] : 0;
						
						let raw_rural = Math.max(0, ghs_val - urb_val);
						return Math.ceil(raw_rural * rural_scalar);
					}
				});
				
				//Write Total Population Raster: Exact Urban + Scaled Rural
				let final_rural_raster = loadNumberRasterImage(local_rural_file_path);
				
				saveNumberRasterImage({
					file_path: local_population_file_path,
					height: 2160,
					width: 4320,
					
					function: function (arg0_index) {
						let index = arg0_index;
						let urb_val = (local_urban_raster && local_urban_raster.data[index]) ? local_urban_raster.data[index] : 0;
						let rur_val = (final_rural_raster && final_rural_raster.data[index]) ? final_rural_raster.data[index] : 0;
						
						return urb_val + rur_val;
					}
				});
				
				let current_population = getImageSum(local_population_file_path);
				console.log(` - Rural Scalar: ${rural_scalar}, Current Population: ${parseNumber(current_population)} | Target Population: ${parseNumber(target_population)}`);
			}
			
			console.log(`- Finished writing ${local_population_file_path} for Stadestér Population.`);
			console.log(` - Global population: ${parseNumber(getImageSum(local_population_file_path))}`);
			console.log(`- Finished regenerating ${local_rural_file_path} for Stadestér Rural Population.`);
		}
	};
	
	global.generateStadesterRasters = function () {
		//1. Generate rasters to begin with
		generateStadesterUrbanRasters();
		generateStadesterRuralRasters();
			//generateStadesterNorthernAmericaRasters();
		generateStadesterPopulationRasters();
	};
}