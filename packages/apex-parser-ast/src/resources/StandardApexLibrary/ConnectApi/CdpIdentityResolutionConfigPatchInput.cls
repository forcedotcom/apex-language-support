/**
 * Input representation for updating an identity resolution ruleset.
 */
global class CdpIdentityResolutionConfigPatchInput {

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

}