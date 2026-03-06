/**
 * Represents the attribute filter input.
 */
global class AttributeFilterInput {

  /**
   * ID of the attribute.
   */
  global String attributeId;

  /**
   * Name of the attribute.
   */
  global String attributeName;

  /**
   * Date unit filter.
   */
  global Datetime dateUnits;

  /**
   * Operator of the attribute.
   */
  global String operator;

  /**
   * Type of attribute. FilterOperatorDataTypeBoolean FilterOperatorDataTypeDate FilterOperatorDataTypeDateOnly FilterOperatorDataTypeExactlyRelativeDate FilterOperatorDataTypeNumber FilterOperatorDataTypeRelateToNowDate FilterOperatorDataTypeText
   */
  global FilterOperatorDataTypeEnum type;

  /**
   * Filter values.
   */
  global List < String > value;

}