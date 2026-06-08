/**
 * Recordset filter criteria and the filtered records.
 */
global class RecordsetFilterCriteria {

  global RecordsetFilterCriteria() {}

  /**
   * Recordset filter criteria ID.
   */
  global String criteriaId;

  /**
   * List of filtered record IDs.
   */
  global List < String > recordIds;

  global Object clone() {}

}