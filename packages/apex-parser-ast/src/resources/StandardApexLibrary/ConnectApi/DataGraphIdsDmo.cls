/**
 * Represents data about the Data Model Object (DMO) that contains the ID table for the data graph.
 */
global class DataGraphIdsDmo {

  /**
   * Developer name of the DMO.
   */
  global String developerName;

  /**
   * List of fields for the DMO.
   */
  global List < ConnectApi.DataGraphIdsDmoField > fields;

}