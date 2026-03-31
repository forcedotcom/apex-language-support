/**
 * Field change value segment.
 */
global class FieldChangeValueSegment extends ConnectApi.MessageSegment {

  /**
   * Value type of a field change. NewValue —A new value OldValue —An old value
   */
  global ConnectApi.FieldChangeValueType Enum valueType;

  /**
   * URL value if the field change is to a URL field (such as a web address)
   */
  global String url;

}