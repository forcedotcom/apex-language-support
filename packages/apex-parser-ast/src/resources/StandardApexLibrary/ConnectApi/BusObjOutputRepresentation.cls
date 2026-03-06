/**
 * Business objective, or goal.
 */
global class BusObjOutputRepresentation {

  /**
   * List of business objective associations.
   */
  global List < ConnectApi.BusObjAssociationsOutputRepresentation > associations;

  /**
   * Description of the business objective.
   */
  global String description;

  /**
   * Display name of the business objective.
   */
  global String displayName;

  /**
   * ID of the business objective.
   */
  global String id;

}