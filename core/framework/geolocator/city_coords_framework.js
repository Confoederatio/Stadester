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

    var search_btn = await getElement(`button[aria-label="Search"]`);
    var place_input = await getElement(`input[id="searchboxinput"]`);

    //Clear the search box before entering the new city name
    await browser_instance.evaluate(() => {
      var local_place_input = document.querySelector(`input[id="searchboxinput"]`);

      if (local_place_input) {
        local_place_input.value = "";
        local_place_input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await place_input.type(city_name);
    await sleep(randomNumber(100, 500));
    await search_btn.click();
    await sleep(randomNumber(100, 500));

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

    //Return statement
    return [parseFloat(lat_value), parseFloat(lng_value)];
  };

  /**
   * launchCityCoordsInstance() - Launches a browser instance to go to Google Maps. Internal helper function.
   */
  global.launchCityCoordsInstance = async function () {
    if (!global.browser_instance)
      await initialiseChrome();

    //Run a browser instance to go to latlong.net
    await global.browser_instance.goto('https://www.google.com/maps/');
  };
}