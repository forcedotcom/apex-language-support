/**
 * Contains methods for accessing the component fields of address compound fields.
 */
global class Address {

  /**
   * Returns the city field of this address.
   * @return String
   */
  public String getCity() {}

  /**
   * Returns the text-only country/territory name component of this address.
   * @return String
   */
  public String getCountry() {}

  /**
   * Returns the country/territory code of this address if state and country/territory picklists are enabled in your organization. Otherwise, returns null .
   * @return String
   */
  public String getCountryCode() {}

  /**
   * Returns the distance from this location to the specified location using the specified unit.
   * @param toLocation The Location to which you want to calculate the distance from the current Location .
   * @param unit The distance unit you want to use: mi or km .
   * @return Double
   */
  public Double getDistance(Location toLocation, String unit) {}

  /**
   * When using geolocation data for a given address, this method gives you relative location information based on latitude and longitude values. For example, you can find out if the latitude and longitude values point to the middle of the street, instead of the exact address.
   * @return String
   */
  public String getGeocodeAccuracy() {}

  /**
   * Returns the latitude field of this address.
   * @return Double
   */
  public Double getLatitude() {}

  /**
   * Returns the longitude field of this address.
   * @return Double
   */
  public Double getLongitude() {}

  /**
   * Returns the postal code of this address.
   * @return String
   */
  public String getPostalCode() {}

  /**
   * Returns the text-only state name component of this address.
   * @return String
   */
  public String getState() {}

  /**
   * Returns the state code of this address if state and country/territory picklists are enabled in your organization. Otherwise, returns null .
   * @return String
   */
  public String getStateCode() {}

  /**
   * Returns the street field of this address.
   * @return String
   */
  public String getStreet() {}

}