/**
 * A Schema.sObjectField object is returned from the field describe result using the getController and getSObjectField methods.
 */
global class SObjectField {

  global SObjectField() {}

  /**
   * Returns the describe field result for this field.
   * @return Schema.DescribeFieldResult
   */
  global Schema.DescribeFieldResult getDescribe() {}

  /**
   * Returns the describe field result for this field.
   * @param options 
   * @return Schema.DescribeFieldResult
   */
  global Schema.DescribeFieldResult getDescribe(Object options) {}

  global Object clone() {}

}