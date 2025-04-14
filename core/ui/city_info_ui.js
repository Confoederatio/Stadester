//Initialise functions
{
  global.printCityCoords = function (arg0_city_name) {
    //Convert from parameters
    var city_name = arg0_city_name;

    //Send a CURL request to city_coords_framework
    getCityCoords(city_name).then((coords) => {
      console.log(coords);
    });
  };
}