/**
 * Represents data about the Data Model Object (DMO) that contains the JSON records for the data graph.
 */
global class DataGraphValuesDmo {

  /**
   * Developer name of the DMO.
   */
  global String developerName;

  /**
   * List of fields for the DMO.
   */
  global List < ConnectApi.DataGraphValuesDmoField > fields;

}