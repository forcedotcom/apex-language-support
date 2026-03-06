/**
 * A set of recordset filter criteria applied to records, such as service appointment records.
 */
global class RecordsetFilterCriteriaInput {

  /**
   * Recordset filter criteria IDs.
   */
  global List < String > criteriaIds;

  /**
   * Determines whether record sharing checks are enforced ( true ) or not ( false ) during the execution of this call.
   */
  global Boolean enforceSharing;

  /**
   * Object that the filter is applied to.
   */
  global String filteredObjectName;

  /**
   * List of record IDs of the filtered object.
   */
  global List < String > recordIds;

}