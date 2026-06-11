/**
 * Contains methods for obtaining schema describe information.
 */
global class Schema {

  global Schema() {}

  /**
   * Returns a map of all sObject names (keys) to sObject tokens (values) for the standard and custom objects defined in your organization.
   * @return Map<String, Schema.SObjectType>
   */
  global static Map<String, Schema.SObjectType> getGlobalDescribe() {}

  /**
   * Returns a list of the category groups associated with the specified objects.
   * @param sObjectNames 
   * @return List<Schema.DescribeDataCategoryGroupResult>
   */
  global static List<Schema.DescribeDataCategoryGroupResult> describeDataCategoryGroups(List<String> sObjectNames) {}

  /**
   * Describes metadata (field list and object properties) for the specified sObject or array of sObjects.
   * @param sObjectTypes The sObjectTypes argument is a list of sObject type names you want to describe.
   * @return List<Schema.DescribeSObjectResult>
   */
  global static List<Schema.DescribeSObjectResult> describeSObjects(List<String> sObjectTypes) {}

  /**
   * Describes metadata (field list and object properties) for the specified sObject or array of sObjects.
   * @param SObjectTypes 
   * @param SObjectDescribeOptions 
   * @return List<Schema.DescribeSObjectResult>
   */
  global static List<Schema.DescribeSObjectResult> describeSObjects(List<String> SObjectTypes, Object SObjectDescribeOptions) {}

  /**
   * Returns information about the standard and custom apps available to the running user.
   * @return List<Schema.DescribeTabSetResult>
   */
  global static List<Schema.DescribeTabSetResult> describeTabs() {}

  global static List<Schema.DescribeDataCategoryGroupStructureResult> describeDataCategoryGroupStructures(List<Schema.DataCategoryGroupSobjectTypePair> pairs, Boolean topCategoriesOnly) {}

  global static Map<String,Schema.SObjectType> getAppDescribe(String appName) {}

  global static Map<String,Schema.SObjectType> getModuleDescribe(String moduleName) {}

  global static Map<String,Schema.SObjectType> getModuleDescribe() {}

  global Object clone() {}

}