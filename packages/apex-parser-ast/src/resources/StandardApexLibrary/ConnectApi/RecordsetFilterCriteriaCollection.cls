/**
 * List of the recordset filters and records.
 */
global class RecordsetFilterCriteriaCollection {

  global RecordsetFilterCriteriaCollection() {}

  /**
   * Collection of recordset filter criteria IDs and filtered record IDs.
   */
  global List < ConnectApi.RecordsetFilterCriteria > recordsetFilters;

  global Object clone() {}

}