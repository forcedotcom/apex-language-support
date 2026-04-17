/**
 * Represents recency criteria of the object data for a data graph.
 */
global class RecencyCriteria {

  /**
   * API name of the field to which recency criteria is applied.
   */
  global String fieldName;

  /**
   * Value of the recency criteria.
   */
  global String value;

  /**
   * Type of value for the recency criteria. Valid values are time and record .
   */
  global String valueType;

  /**
   * Unit of measure for the recency criteria. For a value of type time , the valid value is DAY . For a value of type record , the valid value is RECORD .
   */
  global String valueUnit;

}