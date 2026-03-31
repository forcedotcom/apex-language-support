/**
 * A Schema.sObjectField object is returned from the field describe result using the getController and getSObjectField methods.
 */
global class SObjectField {

  /**
   * Returns the describe field result for this field.
   * @return Schema.DescribeFieldResult
   */
  public Schema.DescribeFieldResult getDescribe() {}

  /**
   * Returns the describe field result for this field.
   * @param options 
   * @return Schema.DescribeFieldResult
   */
  public Schema.DescribeFieldResult getDescribe(Object options) {}

}