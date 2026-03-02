/**
 * Contains methods for accessing the component fields of geolocation compound fields.
 */
public class Location {

  /**
   * Calculates the distance between this location and the specified location, using an approximation of the haversine formula and the specified unit.
   * @param toLocation The Location to which you want to calculate the distance from the current Location .
   * @param unit The distance unit you want to use: mi or km .
   * @return Double
   */
  public Double getDistance(Location toLocation, String unit) {}

  /**
   * Calculates the distance between this location and the specified location, using an approximation of the haversine formula and the specified unit.
   * @param firstLocation 
   * @param secondLocation 
   * @param unit The distance unit you want to use: mi or km .
   * @return Double
   */
  public static Double getDistance(Location firstLocation, Location secondLocation, String unit) {}

  /**
   * Returns the latitude field of this location.
   * @return Double
   */
  public Double getLatitude() {}

  /**
   * Returns the longitude field of this location.
   * @return Double
   */
  public Double getLongitude() {}

  /**
   * Creates an instance of the Location class, with the specified latitude and longitude.
   * @param latitude 
   * @param longitude 
   * @return Location
   */
  public static Location newInstance(Decimal latitude, Decimal longitude) {}

}