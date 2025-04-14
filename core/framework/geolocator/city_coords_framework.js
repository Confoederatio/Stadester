//Initialise functions
{
  /**
   * getCityCoords() - Returns city coordinates as a [lat, lng] array. Async, so you must either await or use .then().
   * @param {String} arg0_city_name 
   * 
   * @returns {Array<number, number>}
   */
  global.getCityCoords = async function (arg0_city_name) {
    //Convert from parameters
    var city_name = arg0_city_name;

    //Declare local instance variables
    if (!global.browser_instance) await launchCityCoordsInstance();

    //Clear the search box before entering the new city name
    await browser_instance.evaluate((city_name) => {
      var place_input = document.getElementById("searchboxinput");
      place_input.value = city_name;
    }, city_name);
    await sleep(randomNumber(1000, 1400));
    await browser_instance.evaluate(() => {
      var search_btn = document.querySelector("button[aria-label='Search']");
      search_btn.click();
    });

    //Fetch URL; this is where the latlng coordinates reside
    await browser_instance.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(randomNumber(800, 1000));

    var lat_value = 0;
    var lng_value = 0;
    var url = browser_instance.url();
    var match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    //Get the lat and lng inputs
    if (match) {
      lat_value = match[1];
      lng_value = match[2];
    }

    await sleep(randomNumber(800, 1000));

    //Check to see if Google Maps could find the coordinate; if not override lat_value, lng_value
    try {
      var coords_found = true;
      var search_result_el = await getElement("div.fontHeadlineSmall");
      await sleep(randomNumber(800, 1000));
      var search_result_text_content = await search_result_el.evaluate((element) => element.textContent, search_result_el);
      console.log(`- Search result text content: ${search_result_text_content}`);
  
      if (search_result_text_content.includes("can't find"))
        coords_found = false;
  
      if (!coords_found) {
        lat_value = 0;
        lng_value = 0;
      }
    } catch (e) {}

    //Return statement
    return [parseFloat(lat_value), parseFloat(lng_value)];
  };

  /**
   * launchCityCoordsInstance() - Launches a browser instance to go to Google Maps. Internal helper function.
   */
  global.launchCityCoordsInstance = async function () {
    if (!global.browser_instance)
      await initialiseChrome();
    global.browser_instance.setDefaultNavigationTimeout(120000);

    //Run a browser instance to go to latlong.net
    await global.browser_instance.goto('https://www.google.com/maps/');
  };
}