/**
 * Identity resolution ruleset’s match rule.
 */
global class CdpIdentityResolutionMatchRuleOutput {

  /**
   * Object and field the match rule applies to and the match method applied.
   */
  global List < ConnectApi.CdpIdentityResolutionMatchCriterionOutput > criteria;

  /**
   * User friendly name for the identity resolution match rule.
   */
  global String label;

}