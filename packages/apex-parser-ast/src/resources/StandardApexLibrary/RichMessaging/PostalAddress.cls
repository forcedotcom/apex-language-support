/**
 * Represents the postal address.
 */
global class PostalAddress {

  public PostalAddress(List<String> addressLines, String subLocality, String locality, String postalCode, String subAdministrativeArea, String administrativeArea, String country, String countryCode) {}

  public List<String> addressLines;

  public String administrativeArea;

  public String country;

  public String countryCode;

  public String locality;

  public String postalCode;

  public String subAdministrativeArea;

  public String subLocality;

  global Object clone() {}

}