/**
 * A business objective, or goal.
 */
global class BusObjInputRepresentation {

  /**
   * List of business objective associations.
   */
  global List < ConnectApi.BusObjAssociationsInputRepresentation > associations;

  /**
   * Description of the business objective.
   */
  global String description;

  /**
   * Label name of the business objective.
   */
  global String labelName;

}