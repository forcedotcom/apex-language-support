/**
 * Opportunity stage picklist value attributes.
 */
global class OpportunityStagePicklistValueAttributes {

  /**
   * Specifies whether the opportunity has a stage of closed ( true ) or not ( false ). Multiple opportunity stage values can represent a closed opportunity.
   */
  global Boolean closed;

  /**
   * Default percentage estimate of the confidence in closing an opportunity for this opportunity stage value. Value is null if forecasting isn’t enabled for the org.
   */
  global String forecastCategoryName;

  /**
   * Default forecast category value for this opportunity stage value. Value is null if forecasting isn’t enabled for the org.
   */
  global Double deafultProbability;

  /**
   * Specifies whether the opportunity has a stage of won ( true ) or not ( false ). Multiple opportunity stage values can represent a won opportunity.
   */
  global Boolean won;

}