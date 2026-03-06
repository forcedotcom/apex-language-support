/**
 * Business objective association.
 */
global class BusObjAssociationsInputRepresentation {

  /**
   * Association ID for the business objective, or goal.
   */
  global String id;

  /**
   * Definition category of the business objective, or goal. Values are: Webstore
   */
  global ConnectApi.GoalDefinitionCategoryEnum type;

}