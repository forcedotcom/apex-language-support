/**
 * Use the methods in the System.FeatureManagement class to check and modify the values of feature parameters, and to show or hide custom objects and custom permissions in your subscribers’ orgs.
 */
public class FeatureManagement {

  /**
   * Hides or reveals custom permissions, or reveals custom objects, in your subscriber’s org.
   * @param apiName The API name of the custom object or custom permission to show or hide—for example, ' MyCustomObject__c ' or ' MyCustomPermission ' .
   * @param typeApiName The API name of the type that you want to show or hide: ' CustomObject ' or ' CustomPermission ' .
   * @param protection To show a custom object or custom permission, 'Unprotected' . To hide a custom permission, 'Protected' .
   */
  public static void changeProtection(String apiName, String typeApiName, String protection) {}

  /**
   * Checks the value__c value of the FeatureParameterBoolean__c record for a feature parameter in your subscriber’s org. You set the record’s value using setPackageBooleanValue(apiName, value) .
   * @param apiName The fullName__c value of the feature parameter whose value you want to check—for example, ' SpecialAccessAvailable ' .
   * @return Boolean
   */
  public static Boolean checkPackageBooleanValue(String apiName) {}

  /**
   * Checks the value__c value of the FeatureParameterDate__c record for a feature parameter in your subscriber’s org. You can set the record’s value using setPackageDateValue(apiName, value) .
   * @param apiName The fullName__c value of the feature parameter whose value you want to check—for example, ' TrialExpirationDate ' .
   * @return Date
   */
  public static Date checkPackageDateValue(String apiName) {}

  /**
   * Checks the value__c value of the FeatureParameterInteger__c record for a feature parameter in your subscriber’s org. You can set the record’s value using setPackageIntegerValue(apiName, value) .
   * @param apiName The fullName__c value of the feature parameter whose value you want to check—for example, ' NumberOfLicenses ' .
   * @return Integer
   */
  public static Integer checkPackageIntegerValue(String apiName) {}

  /**
   * Checks whether a custom permission is enabled.
   * @param apiName The API name of the custom permission to check the value of—for example, ' MyCustomPermission ' .
   * @return Boolean
   */
  public static Boolean checkPermission(String apiName) {}

  /**
   * Sets the value__c value of the FeatureParameterBoolean__c record for a subscriber-to-LMO feature parameter in your subscriber’s org. You can check the record’s value using checkPackageBooleanValue(apiName) .
   * @param apiName The fullName__c value of the feature parameter whose value you want to set—for example, ' SpecialAccessAvailable ' .
   * @param value The value to assign to the value__c field on the FeatureParameterBoolean__c record that associates the feature parameter with its related license.
   */
  public static void setPackageBooleanValue(String apiName, Boolean value) {}

  /**
   * Sets the value__c value of the FeatureParameterDate__c record for a subscriber-to-LMO feature parameter in your subscriber’s org. You can check the record’s value using checkPackageDateValue(apiName) .
   * @param apiName The fullName__c value of the feature parameter whose value you want to set—for example, ' TrialExpirationDate ' .
   * @param value The value to assign to the value__c field on the FeatureParameterDate__c record that associates the feature parameter with its related license.
   */
  public static void setPackageDateValue(String apiName, Date value) {}

  /**
   * Sets the value__c value of the FeatureParameterInteger__c record for a subscriber-to-LMO feature parameter in your subscriber’s org. You can check the record’s value using checkPackageIntegerValue(apiName) .
   * @param apiName The fullName__c value of the feature parameter whose value you want to set—for example, ' NumberOfLicenses ' .
   * @param value The value to assign to the value__c field on the FeatureParameterInteger__c record that associates the feature parameter with its related license.
   */
  public static void setPackageIntegerValue(String apiName, Integer value) {}

}