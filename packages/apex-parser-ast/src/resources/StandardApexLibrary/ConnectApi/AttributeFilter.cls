/**
 * Represents the attribute filter output.
 */
global class AttributeFilter {

  /**
   * ID of the attribute.
   */
  global String attributeId;

  /**
   * Name of the attribute.
   */
  global String attributeName;

  /**
   * Date units for the attribute.
   */
  global Datetime dateUnits;

  /**
   * Operator for the attribute.
   */
  global String operator;

  /**
   * Type of attribute. FilterOperatorDataTypeBoolean FilterOperatorDataTypeDate FilterOperatorDataTypeDateOnly FilterOperatorDataTypeExactlyRelativeDate FilterOperatorDataTypeNumber FilterOperatorDataTypeRelateToNowDate FilterOperatorDataTypeText
   */
  global FilterOperatorDataTypeEnum type;

  /**
   * Values for the attribute.
   */
  global List < String > values;

}