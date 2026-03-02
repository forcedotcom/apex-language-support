/**
 * Custom settings are similar to custom objects and enable application developers to create custom sets of data, as well as create and associate custom data for an organization, profile, or specific user. All custom settings data is exposed in the application cache, which enables efficient access without the cost of repeated queries to the database. This data is then available for formula fields, validation rules, flows, Apex, and the SOAP API.
 */
public class Custom Settings Methods {

  /**
   * Returns a map of the data sets defined for the custom setting.
   * @return Map< String , CustomSetting__c>
   */
  public Map< String , CustomSetting__c> getAll() {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getValues( dataSetName ) .
   * @param dataSetName 
   * @return CustomSetting__c
   */
  public CustomSetting__c getInstance(String dataSetName) {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getInstance( dataSetName ) .
   * @param dataSetName 
   * @return CustomSetting__c
   */
  public CustomSetting__c getValues(String dataSetName) {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getValues( dataSetName ) .
   * @return CustomSetting__c
   */
  public CustomSetting__c getInstance() {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getValues( dataSetName ) .
   * @param userId 
   * @return CustomSetting__c
   */
  public CustomSetting__c getInstance(ID userId) {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getValues( dataSetName ) .
   * @param profileId 
   * @return CustomSetting__c
   */
  public CustomSetting__c getInstance(ID profileId) {}

  /**
   * Returns the custom setting data set record for the organization.
   * @return CustomSetting__c
   */
  public CustomSetting__c getOrgDefaults() {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getInstance( dataSetName ) .
   * @param userId 
   * @return CustomSetting__c
   */
  public CustomSetting__c getValues(ID userId) {}

  /**
   * Returns the custom setting data set record for the specified data set name. This method returns the exact same object as getInstance( dataSetName ) .
   * @param profileId 
   * @return CustomSetting__c
   */
  public CustomSetting__c getValues(ID profileId) {}

}