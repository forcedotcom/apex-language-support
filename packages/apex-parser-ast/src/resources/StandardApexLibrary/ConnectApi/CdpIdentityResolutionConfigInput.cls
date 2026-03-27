/**
 * Input representation for creating an identity resolution ruleset.
 */
global class CdpIdentityResolutionConfigInput {

  /**
   * Source object for an identity resolution ruleset. Values are: Account Individual
   */
  global ConnectApi.CdpIdentityResolutionConfigurationType configurationType;

  /**
   * Description of the identity resolution ruleset.
   */
  global String description;

  /**
   * Specifies whether automatic job run scheduling is enabled for the ruleset ( true ) or not ( false ). If unspecified, defaults to false .
   */
  global Boolean doesRunAutomatically;

  /**
   * User friendly name of the identity resolution ruleset.
   */
  global String label;

  /**
   * List of match rules for the identity resolution ruleset.
   */
  global List < ConnectApi.CdpIdentityResolutionMatchRule > matchRules;

  /**
   * List of reconciliation rules for the identity resolution ruleset.
   */
  global List < ConnectApi.CdpIdentityResolutionReconciliationRule > reconciliationRules;

  /**
   * Extended ID of the ruleset used to differentiate between rulesets created for comparison. The ruleset ID must be unique and can't be longer than 4 characters.
   */
  global String rulesetId;

}