/**
 * Identity resolution ruleset's reconciliation rule for a field.
 */
global class CdpIdentityResolutionReconciliationFieldRuleOutput {

  /**
   * The field that this reconciliation rule applies to.
   */
  global String fieldName;

  /**
   * Default reconciliation rule applied to fields in the object the reconciliation rule applies to. Values are: LastUpdated MostFrequent SourceSequence
   */
  global ConnectApi.CdpIdentityResolutionReconciliationRuleType ruleType;

  /**
   * Specifies whether to ignore an empty value ( true ) or not ( false ).
   */
  global Boolean shouldIgnoreEmptyValue;

  /**
   * If ruleType is SourceSequence , a prioritized list of data sources.
   */
  global List < ConnectApi.CdpIdentityResolutionReconciliationSourceOutput > sources;

}