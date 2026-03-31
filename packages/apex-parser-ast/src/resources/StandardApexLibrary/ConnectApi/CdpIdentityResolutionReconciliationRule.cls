/**
 * Input representation for an identity resolution ruleset's default reconciliation rule for an object.
 */
global class CdpIdentityResolutionReconciliationRule {

  /**
   * API name of the Data Model Object the reconciliation rule applies to.
   */
  global String entityName;

  /**
   * Field-specific reconciliation rules that override this default rule for the specified field.
   */
  global List < ConnectApi.CdpIdentityResolutionReconciliationFieldRule > fields;

  /**
   * Default reconciliation rule applied to fields in the object the reconciliation rule applies to. Values are: LastUpdated MostFrequent SourceSequence
   */
  global ConnectApi.CdpIdentityResolutionReconciliationRuleType ruleType;

  /**
   * Specifies whether to ignore an empty value ( true ) or not ( false ).
   */
  global Boolean shouldIgnoreEmptyValue;

  /**
   * If ruleType is SourceSequence , a list of data sources in priority order.
   */
  global List < ConnectApi.CdpIdentityResolutionReconciliationSource > sources;

}