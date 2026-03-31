/**
 * Identity resolution ruleset.
 */
global class CdpIdentityResolutionOutput {

  /**
   * Count of anonymous unified profiles created by running the identity resolution ruleset.
   */
  global Long anonymousUnifiedProfiles;

  /**
   * Source object for an identity resolution ruleset. Values are: Account Individual
   */
  global ConnectApi.CdpIdentityResolutionConfigurationType configurationType;

  /**
   * Consolidation rate resulting from the run of an identity resolution ruleset.
   */
  global Double consolidationRate;

  /**
   * Data space used as source data for an identity resolution ruleset.
   */
  global String dataSpaceName;

  /**
   * Description of the identity resolution ruleset.
   */
  global String description;

  /**
   * Specifies whether automatic job run scheduling is enabled for the ruleset ( true ) or not ( false ). If unspecified, defaults to false .
   */
  global Boolean doesRunAutomatically;

  /**
   * Identity resolution ruleset's ID. This is not the identity resolution's extended ruleset ID ( rulesetId ).
   */
  global String id;

  /**
   * Count of known unified profiles created by running the identity resolution ruleset.
   */
  global Long knownUnifiedProfiles;

  /**
   * User friendly name of the identity resolution ruleset.
   */
  global String label;

  /**
   * Date and time the last job completed.
   */
  global Datetime lastJobCompleted;

  /**
   * Last job's status. Possible values are: SUCCESS IN_PROGRESS FAIL SCHEDULED SKIPPED
   */
  global String lastJobStatus;

  /**
   * List of match rules.
   */
  global List < ConnectApi.CdpIdentityResolutionMatchRuleOutput > matchRules;

  /**
   * Count of matched source profiles identified by running the identity resolution ruleset.
   */
  global Long matchedSourceProfiles;

  /**
   * Object name of the identity resolution ruleset.
   */
  global String objectApiName;

  /**
   * List of reconciliation rules.
   */
  global List < ConnectApi.CdpIdentityResolutionReconciliationRuleOutput > reconciliationRules;

  /**
   * Extension ID of a ruleset. The ruleset ID must be unique and no longer than 4 characters. This ID is not the identifying ID for the ruleset.
   */
  global String rulesetId;

  /**
   * Status of a ruleset job. Possible values are: NEW PUBLISHING PUBLISHED ERROR DELETING DELETE_FAILED
   */
  global String rulesetStatus;

  /**
   * Count of source profiles that were processed by a ruleset job.
   */
  global Long sourceProfiles;

  /**
   * Count of unified profiles created by running the identity resolution ruleset.
   */
  global Long totalUnifiedProfiles;

}