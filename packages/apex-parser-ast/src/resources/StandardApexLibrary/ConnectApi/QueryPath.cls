/**
 * Represents a query path.
 */
global class QueryPath {

  global QueryPath() {}

  /**
   * Label of the field.
   */
  global String fieldLabel;

  /**
   * Name of the field.
   */
  global String fieldName;

  /**
   * Label of the object.
   */
  global String objectLabel;

  /**
   * Name of the object.
   */
  global String objectName;

  global Object clone() {}

}