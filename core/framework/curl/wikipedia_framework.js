//Initialise functions
{
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