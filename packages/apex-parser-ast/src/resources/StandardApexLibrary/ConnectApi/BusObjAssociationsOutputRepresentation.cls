/**
 * Association details of a business objective
 */
global class BusObjAssociationsOutputRepresentation {

  global BusObjAssociationsOutputRepresentation() {}

  /**
   * 18-character unique identifier for the business objective association.
   */
  global String id;

  /**
   * Definition category of the business objective, or goal. Values are: Webstore
   */
  global ConnectApi.GoalDefinitionCategoryEnum type;

  global Object clone() {}

}