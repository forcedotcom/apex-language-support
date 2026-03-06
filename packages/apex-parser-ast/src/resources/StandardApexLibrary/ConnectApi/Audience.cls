/**
 * A personalization audience.
 */
global class Audience {

  /**
   * Criteria details for the audience.
   */
  global List < ConnectApi.AudienceCriteriaDetail > criteria;

  /**
   * Custom formula for the audience criteria. For example, (1 AND 2) OR 3.
   */
  global String customFormula;

  /**
   * Formula filter type for the personalization audience. Values are: AllCriteriaMatch —All audience criteria are true (AND operation). AnyCriterionMatches —Any audience criterion is true (OR operation). CustomLogicMatches —Audience criteria match the custom formula (for example, (1 AND 2) OR 3).
   */
  global ConnectApi.FormulaFilterType formulaFilterType;

  /**
   * ID of the audience.
   */
  global String id;

  /**
   * Name of the audience.
   */
  global String name;

  /**
   * Target assignments for the audience.
   */
  global List < ConnectApi.AudienceTargetAssignment > targets;

  /**
   * URL to this audience.
   */
  global String url;

}