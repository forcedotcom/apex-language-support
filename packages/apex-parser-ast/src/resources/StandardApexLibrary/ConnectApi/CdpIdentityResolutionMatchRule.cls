/**
 * Input representation for an identity resolution ruleset’s match rule.
 */
global class CdpIdentityResolutionMatchRule {

  /**
   * Object and field the match rule applies to and the match method applied.
   */
  global List < ConnectApi.CdpIdentityResolutionMatchCriterion > criteria;

  /**
   * User friendly name for the identity resolution match rule.
   */
  global String label;

}