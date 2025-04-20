//Initialise functions
{
  global.getWikipediaCityData = async function (arg0_link) {
    //Convert from parameters
    var link = arg0_link;

    //Declare local instance variables
    var dom_obj = await JSDOM.fromURL(link);
    var dom_document = dom_obj.window.document;
    var return_obj = {};
    var wikipedia_processing_obj = config.wikipedia.processing;
    
    //Fetch population table element
    var population_table_el;
    var population_table_els = dom_document.querySelectorAll(wikipedia_processing_obj.population_table_selector);

    //1. Fetch population table
    for (var i = 0; i < population_table_els.length; i++) {
      var local_el = population_table_els[i];

      for (var x = 0; x < wikipedia_processing_obj.population_patterns.length; x++) {
        var local_header_el = local_el.querySelector("caption");
        var local_pattern = wikipedia_processing_obj.population_patterns[x].toLowerCase().trim();

        if (local_header_el) {
          var local_text_content = local_el.textContent.toLowerCase().trim();

          if (local_text_content.includes(local_pattern)) {
            var has_year = false;

            for (var y = 0; y < wikipedia_processing_obj.year_patterns.length; y++)
              if (local_text_content.includes(wikipedia_processing_obj.year_patterns[y]))
                has_year = true;

            if (has_year) {
              population_table_el = local_el;
              break;
            }
          }
        }
      }
      if (population_table_el)
        break;
    }
    
    if (population_table_el) {
      var in_thousands = false;
      var in_millions = false;

      //1. Check if the population is in thousands or millions
      for (var x = 0; x < wikipedia_processing_obj.thousands_patterns.length; x++) {
        var local_pattern = wikipedia_processing_obj.thousands_patterns[x].toLowerCase().trim();
        var local_text_content = population_table_el.textContent.toLowerCase().trim();

        if (local_text_content.includes(local_pattern)) {
          in_thousands = true;
          break;
        }
      }
      for (var x = 0; x < wikipedia_processing_obj.millions_patterns.length; x++) {
        var local_pattern = wikipedia_processing_obj.millions_patterns[x].toLowerCase().trim();
        var local_text_content = population_table_el.textContent.toLowerCase().trim();

        if (local_text_content.includes(local_pattern)) {
          in_millions = true;
          break;
        }
      }

      //2. Fetch population data
      var all_rows = population_table_el.querySelectorAll("tr");

      for (var x = 0; x < all_rows.length; x++) {
        var local_row = all_rows[x];
        var local_row_has_number = false;

        var local_cells = local_row.querySelectorAll("th, td");
        var local_population;
        var local_year;
        
        //Iterate over local_cells
        for (var y = 0; y < local_cells.length; y++) {
          var local_value = parseFloat(stripNonNumerics(local_cells[y].textContent));

          if (!isNaN(local_value)) {
            local_row_has_number = true;
            break;
          }
        }

        if (local_row_has_number) {
          for (var y = 0; y < local_cells.length; y++) {
            var all_sup_els = local_cells[y].querySelectorAll("sup");
            if (all_sup_els.length)
              for (var z = 0; z < all_sup_els.length; z++)
                all_sup_els[z].remove();

            var local_content = local_cells[y].textContent;
              local_content = local_content.split(/[-–]/)[0];
            var local_value = (!local_content.includes(",")) ? 
              parseFloat(local_content) : parseFloat(stripNonNumerics(local_content));
            if (isNaN(local_value))
              local_value = parseFloat(stripNonNumerics(local_content));
            
            if (y == 0) {
              local_year = local_value;
            } else if (y == 1) {
              if (in_thousands) {
                local_value *= 1000;
              } else if (in_millions) {
                local_value *= 1000000;
              }

              local_population = local_value;
            }
          }

          if (!isNaN(local_population)) {
            var is_not_error = true;

            if (local_year.toString().includes(`e`))
              is_not_error = false;
            if (isNaN(parseInt(local_year)))
              is_not_error = false;

            if (is_not_error)
              modifyValue(return_obj, local_year, local_population);
          }
        }
      }
    } else {
      //There is no population table, check if there is a 'Demographics of' page.
      var all_main_article_els = dom_document.querySelectorAll(`div.hatnote:has(a)`);

      for (var i = 0; i < all_main_article_els.length; i++) {
        var local_links = all_main_article_els[i].querySelectorAll("a");

        for (var x = 0; x < local_links.length; x++)
          if (local_links[x].textContent.toLowerCase().trim().includes("demographics of ")) {
            var local_link = local_links[x].getAttribute("href");

            if (local_link.startsWith("/wiki/")) {
              var absolute_url = `https://en.wikipedia.org${local_link}`;
              return_obj = await getWikipediaCityData(absolute_url);
            }
          }
      }
    }

    //2. Fetch population total from infobox
    var infobox_el = dom_document.querySelector(`table.infobox.ib-settlement`);

    if (infobox_el) {
      var all_rows = infobox_el.querySelectorAll("tr");
      var population_infobox_value;
      var population_infobox_year;

      for (var x = 0; x < all_rows.length; x++) {
        var local_cell_has_population = false;
        var local_cells = all_rows[x].querySelectorAll("td, th");

        for (var y = 0; y < wikipedia_processing_obj.population_patterns.length; y++) {
          var local_pattern = wikipedia_processing_obj.population_patterns[y].toLowerCase().trim();

          if (all_rows[x].textContent.toLowerCase().trim().includes(local_pattern)) {
            local_cell_has_population = true;
            break;
          }
        }

        if (local_cell_has_population) {
          var year_cell = local_cells[0];
            
          var all_sup_els = year_cell.querySelectorAll("sup");
          for (var z = 0; z < all_sup_els.length; z++)
            all_sup_els[z].remove();

          var local_split_content = year_cell.textContent.split(/\s+/);
          var local_year_content = local_split_content[1];

          if (local_year_content) {
            local_year_content = local_year_content.split(/[-–]/)[0];
            population_infobox_year = stripNonNumerics(local_year_content);
          }
        }

        //2.1. Immediate post-infobox handling
        if (
          population_infobox_year &&
          isNaN(population_infobox_value)
        )
          for (var y = 1; y < local_cells.length; y++) {
            var local_cell = local_cells[y];

            if (local_cell) {
              var all_sup_els = local_cell.querySelectorAll("sup");
              for (var z = 0; z < all_sup_els.length; z++)
                all_sup_els[z].remove();

              var local_content = local_cell.textContent;
              local_content = local_content.split(/[-–]/)[0];
              var local_value = (!local_content.includes(",")) ? 
                parseFloat(local_content) : parseFloat(stripNonNumerics(local_content));
              if (isNaN(local_value))
                local_value = parseFloat(stripNonNumerics(local_content));

              if (!isNaN(local_value)) {
                population_infobox_value = local_value;
                break;
              }
            }
          }
      }

      if (population_infobox_year && !isNaN(population_infobox_value))
        return_obj[population_infobox_year] = population_infobox_value;
    }

    //Return statement
    return return_obj;
  };

  global.getWikipediaCityLink = async function (arg0_city_name) {
    //Convert from parameters
    var city_name = arg0_city_name;

    //Declare local instance variables
    var split_city_name = city_name.split(/,|-/);
    var wikipedia_entries = {};
    if (!global.browser_instance) {
      await launchWikipediaInstance();
    } else {
      await global.browser_instance.goto('https://en.wikipedia.org/w/index.php?search');
    }

    if (split_city_name.length > 1) {
      city_country = split_city_name[split_city_name.length - 1].toLowerCase().trim();
      split_city_name.pop();
    }
    city_name = split_city_name.join(", ");

    //Wait for browser_instance to be idle before typing the city_name
    await browser_instance.waitForNavigation({ waitUntil: 'networkidle2' });
    await browser_instance.evaluate((city_name) => {
      var search_input = document.querySelector(`input#ooui-php-1[name="search"]`);
      search_input.value = city_name;
    }, city_name);
    await sleep(randomNumber(500, 1000));
    await browser_instance.evaluate(() => {
      var search_btn = document.querySelector(`form[id*="search"] button[type="submit"]`);
      search_btn.click();
    });

    await browser_instance.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(randomNumber(1000, 2000));
    await browser_instance.evaluate((wikipedia_entries) => {
      var all_wikipedia_entries = document.querySelectorAll(`li.mw-search-result`);

      for (var i = 0; i < all_wikipedia_entries.length; i++) {
        var local_a_el = all_wikipedia_entries[i].querySelector("div.mw-search-result-heading a");
        var local_text_el = all_wikipedia_entries[i].querySelector("div.searchresult");

        var local_link = local_a_el.href;
        var local_text = local_text_el.textContent;
        var local_title = local_a_el.textContent;

        wikipedia_entries[local_link] = {
          link: local_link,
          title: local_title,
          text: local_text,
          score: all_wikipedia_entries.length - i
        };
      }
    }, wikipedia_entries);

    //Iterate over all_wikipedia_entries
    var all_wikipedia_entries = Object.keys(wikipedia_entries);

    for (var i = 0; i < all_wikipedia_entries.length; i++) {
      var local_value = wikipedia_entries[all_wikipedia_entries[i]];

      //Double the score if the name of the country is mentioned
      if (local_value.text.toLowerCase().includes(city_country))
        local_value.score *= 2;

      //Double the score for each mention of 'city'
      var city_matches = local_value.text.toLowerCase().match(/\bcity\b/gi);

      if (city_matches)
        if (city_matches.length)
          local_value.score += city_matches.length;
    }

    //Fetch the wikipedia link with the highest score and return it
    var highest_link = ["", 0];

    for (var i = 0; i < all_wikipedia_entries.length; i++) {
      var local_value = wikipedia_entries[all_wikipedia_entries[i]];

      if (local_value.score > highest_link[1])
        highest_link = [local_value.link, local_value.score];
    }

    //Return statement
    return (highest_link[0] != "") ? highest_link[0] : undefined;
  };

  global.launchWikipediaInstance = async function () {
    if (!global.browser_instance)
      await initialiseChrome();
    global.browser_instance.setDefaultNavigationTimeout(120000);

    //Run a browser instance to go to latlong.net
    await global.browser_instance.goto('https://en.wikipedia.org/w/index.php?search');
  };
}