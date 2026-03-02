/**
 * A Schema.sObjectType object is returned from the field describe result using the getReferenceTo method, or from the sObject describe result using the getSObjectType method.
 */
public class SObjectType {

  /**
   * Returns the describe sObject result for this field.
   * @return Schema.DescribeSObjectResult
   */
  public Schema.DescribeSObjectResult getDescribe() {}

  /**
   * Returns the describe sObject result for this field.
   * @param options 
   * @return Schema.DescribeSObjectResult
   */
  public Schema.DescribeSObjectResult getDescribe(Object options) {}

  /**
   * Constructs a new sObject of this type.
   * @return sObject
   */
  public sObject newSObject() {}

  /**
   * Constructs a new sObject of this type.
   * @param id 
   * @return sObject
   */
  public sObject newSObject(ID id) {}

  /**
   * Constructs a new sObject of this type.
   * @param recordTypeId 
   * @param loadDefaults 
   * @return sObject
   */
  public sObject newSObject(ID recordTypeId, Boolean loadDefaults) {}

}