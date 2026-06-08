/**
 * Represents records of custom metadata types.
 */
global class CustomMetadata {

  global CustomMetadata() {}

  public String description;

  public String label;

  public Boolean protected_x;

  public List<Metadata.CustomMetadataValue> values;

  /**
   * Makes a duplicate copy of the Metadata.CustomMetadata .
   * @return Object
   */
  public Object clone() {}

}