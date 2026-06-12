/**
 * Represents records of custom metadata types.
 */
global class CustomMetadata {

  global CustomMetadata() {}

  global String description;

  global String label;

  global Boolean protected_x;

  global List<Metadata.CustomMetadataValue> values;

  /**
   * Makes a duplicate copy of the Metadata.CustomMetadata .
   * @return Object
   */
  global Object clone() {}

}