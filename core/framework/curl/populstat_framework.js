//Initialise functions
{
  global.getAllLinksRecursively = async function (arg0_url, arg1_options) {
    //Convert from parameters
    var url = arg0_url;
    var options = (arg1_options) ? arg1_options : {};

    //Declare local instance variables
    var all_urls = new Set();

    //Load all links recursively from internal helper function
    await internalHelperGetAllLinksRecursively(url, {
      ...options,
      all_urls: all_urls
    });

    //Return statement
    return all_urls;
  };

  global.getAllPopulstatLinks = function () {
    getAllLinksRecursively("http://populstat.info/", { 
      depth: 5,
      base_url: "http://populstat.info/"
    }).then((all_links) => {
      main.curl.populstat.all_links = all_links;
      console.log(all_links);
    });
  };

  global.getAllPopulstatTownData = async function () {
    //Declare local instance variables
    var all_populstat_town_links = getAllPopulstatTownLinks();
    var return_obj = {};

    //Iterate over all_populstat_town_links
    for (var i = 0; i < all_populstat_town_links.length; i++) {
      var local_key = all_populstat_town_links[i].split("/");
        local_key = local_key[local_key.length - 1].replace("t.htm", "");
      
      console.log(`- Processing ${local_key}, URL: ${all_populstat_town_links[i]}`);
      return_obj[local_key] = await getPopulstatTownData(all_populstat_town_links[i]);
    }

    FileManager.saveFileAsJSON(config.defines.common.input_file_paths.populstat_cities, return_obj);

    //Return statement
    return return_obj;
  };

  global.getAllPopulstatTownLinks = function (arg0_populstat_links) {
    //Convert from parameters
    var populstat_links = (arg0_populstat_links) ? 
      getList(arg0_populstat_links) : config.populstat.all_links;

    //Declare local instance variables
    var all_town_links = [];

    //Iterate over all populstat links
    for (var i = 0; i < populstat_links.length; i++) {
      var local_populstat_link = populstat_links[i].replace("http://", "")
        .replace("https://", "");
      
      if (local_populstat_link.split("/").length >= 3)
        if (local_populstat_link.endsWith("t.htm") || local_populstat_link.endsWith("t.html"))
          all_town_links.push(populstat_links[i]);
    }

    //Return statement
    return all_town_links;
  };

  global.getPopulstatTownData = async function (arg0_url) {
    //Convert from parameters
    var url = arg0_url;

    //Declare local instance variables
    var dom_obj = await JSDOM.fromURL(url);
    var dom_document = dom_obj.window.document;
    var return_obj = {};

    //Fetch the population table elements
    var finished_population_body = false;
    var is_population_body = false;
    var population_header = [];
    var population_table_el = dom_document.querySelector(`table[border=""]`);
    var population_table_rows = population_table_el.querySelectorAll("tr");

    for (var i = 0; i < population_table_rows.length; i++) 
      //Parse header - this should always be the zeroth row
      if (i == 0) {
        var all_cells = population_table_rows[i].querySelectorAll("td");
        var is_year_cell = false;

        for (var x = 0; x < all_cells.length; x++) {
          var first_number;
          var local_split_cell = all_cells[x].textContent.split("/");

          //Fetch the first number in the cell as the given year
          for (var y = 0; y < local_split_cell.length; y++)
            local_split_cell[y] = stripNonNumerics(local_split_cell[y]);
          for (var y = 0; y < local_split_cell.length; y++)
            if (!isNaN(parseInt(local_split_cell[y]))) {
              first_number = parseInt(local_split_cell[y]);
              break;
            } else {
              first_number = undefined;
              is_year_cell = false;
            }
          
            if (first_number != undefined)
              is_year_cell = true;
          
          if (!is_year_cell) {
            population_header.push(all_cells[x].textContent);
          } else {
            population_header.push(first_number);
          }
        }
      } else {
        //Check if we have reached the population body
        var all_cells = population_table_rows[i].querySelectorAll("td");

        //Population body handling
        if (is_population_body && !finished_population_body) {
          if (all_cells.length == 1)
            if (all_cells[0].textContent.trim() == "") {
              finished_population_body = true;
              break;
            }

          return_obj[all_cells[0].textContent] = {};
          var local_entry = return_obj[all_cells[0].textContent];

          //Set .name
          local_entry.name = all_cells[0].textContent;
          
          //Iterate over remaining cell data
          if (all_cells.length > 1)
            for (var x = 1; x < all_cells.length; x++) {
              var local_cell_content = all_cells[x].textContent;
              var local_header_name = population_header[x];

              //Populstat uses European decimal formatting
              var local_number_value = parseEuropeanNumber(local_cell_content);
              var local_value = (!isNaN(local_number_value)) ?
                local_number_value : local_cell_content;

              if (local_value != "")
                local_entry[local_header_name] = local_value;
            }
        }

        //Check if we have reached the population body
        if (all_cells.length == 1)
          if (all_cells[0].textContent.trim() == "")
            is_population_body = true;
        if (all_cells[0].textContent.trim() == "")
          is_population_body = true;
      }

    console.log(`- Population Header:`, population_header);

    //Return statement
    return return_obj;
  };

  global.internalHelperGetAllLinksRecursively = async function (arg0_url, arg1_options) {
    //Declare local instance variables
    var url = arg0_url;
    var options = (arg1_options) ? arg1_options : {};

    //Initialise options
    if (options.all_urls == undefined) options.all_urls = new Set();
    if (!options.base_url) options.base_url = url;
    if (!options.depth) options.depth = 1;
    if (!options.visited_urls) options.visited_urls = new Set();

    //Guard clause if already visited
    if (options.visited_urls.has(url)) return;
    options.visited_urls.add(url);
    
    //Try visiting the given URL
    console.log(`- Attempting to visit ${url} | Depth: ${options.depth} ..`);
    try {
      var dom_obj = await JSDOM.fromURL(url);
      var dom_document = dom_obj.window.document;

      //Iterate over all anchor tags
      var anchor_tags = dom_document.querySelectorAll("a[href]");

      for (let anchor of anchor_tags) {
        var local_href = anchor.getAttribute("href");

        try {
          var absolute_url = new URL(local_href, url).href;

          //Exclude same-page links
          var normalised_url = new URL(absolute_url);
          normalised_url.hash = ""; //Remove fragment
          var normalised_current_url = new URL(url);
          normalised_current_url.hash = ""; //Remove fragment

          //Guard clause for internal section links
          if (normalised_url.href === normalised_current_url.href) continue;

          //Normalise and only visit same-origin links
          if (absolute_url.startsWith(options.base_url)) {
            options.all_urls.add(absolute_url);

            //Recursively visit the new URL
            if (options.depth > 1)
              await internalHelperGetAllLinksRecursively(absolute_url, {
                ...options,
                depth: options.depth - 1
              });
          }
        } catch (e) {} //Skip invalid URLs
      }
    } catch (e) {
      console.error(`- Failed to visit ${url}`);
      console.error(e);
    }
  };
}
