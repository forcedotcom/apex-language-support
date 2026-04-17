/**
 * Represents a field of a data graph.
 */
global class DataGraphField {

  /**
   * Type of the calculated insight field. Dimension Measure ObjectTypeUnspecified
   */
  global DaoObjectFieldTypeQueryEnum ciFieldType;

  /**
   * Developer name of the field.
   */
  global String dataGraphFieldDevName;

  /**
   * Data type of the field.
   */
  global String dataType;

  /**
   * Developer name of the data graph.
   */
  global String developerName;

  /**
   * Indicates whether the field needs to be projected in output JSON ( true ) or not ( false ).
   */
  global String isProjected;

  /**
   * Indicates whether the field is a primary key ( true ) or not ( false ).
   */
  global String keyCol;

  /**
   * Qualifier name of the key for the field.
   */
  global String keyQualifierName;

  /**
   * Length of the field.
   */
  global String length;

  /**
   * Lookup column for the field.
   */
  global String lookupCol;

  /**
   * Indicates whether the field represents a key qualifier field ( KEY_QUALIFIER ) or not ( NONE ).
   */
  global String usageTag;

}