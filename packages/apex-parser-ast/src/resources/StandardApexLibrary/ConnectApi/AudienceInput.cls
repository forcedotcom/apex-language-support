/**
 * A personalization audience.
 */
global class AudienceInput {

  /**
   * List of audience criteria to update or add. An audience can have up to 100 criteria.
   */
  global List < ConnectApi.AudienceCriterionInput > criteria;

  /**
   * Custom formula for the audience criteria. For example, (1 AND 2) OR 3.
   */
  global String customFormula;

  /**
   * Formula filter type for the personalization audience. Values are: AllCriteriaMatch —All audience criteria are true (AND operation). AnyCriterionMatches —Any audience criterion is true (OR operation). CustomLogicMatches —Audience criteria match the custom formula (for example, (1 AND 2) OR 3).
   */
  global ConnectApi.FormulaFilterType formulaFilterType;

  /**
   * Name of the audience.
   */
  global String name;

}