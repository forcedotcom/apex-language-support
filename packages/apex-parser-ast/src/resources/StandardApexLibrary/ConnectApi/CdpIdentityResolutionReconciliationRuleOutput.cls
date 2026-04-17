/**
 * Identity resolution ruleset’s reconciliation rule for an object.
 */
global class CdpIdentityResolutionReconciliationRuleOutput {

  /**
   * API name of the Data Model Object the reconciliation rule applies to.
   */
  global String entityName;

  /**
   * Field-specific reconciliation rules that override this default rule for the specified field.
   */
  global List < ConnectApi.CdpIdentityResolutionReconciliationFieldRuleOutput > fields;

  /**
   * API name of the unified link object created by the identity resolution process.
   */
  global String linkDmoName;

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
  global List < ConnectApi.CdpIdentityResolutionReconciliationSourceOutput > sources;

  /**
   * API name of the unified data model object created by the identity resolution process.
   */
  global String unifiedDmoName;

}