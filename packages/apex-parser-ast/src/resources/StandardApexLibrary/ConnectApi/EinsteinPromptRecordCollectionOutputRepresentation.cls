/**
 * List of prompt template records.
 */
global class EinsteinPromptRecordCollectionOutputRepresentation {

  /**
   * Specifies whether the query returned more prompt template records (true) or not (false) .
   */
  global Boolean hasMoreRecords;

  /**
   * List of prompt template records returned.
   */
  global List < ConnectApi.EinsteinPromptRecordRepresentation > promptRecords;

  /**
   * Number of prompt template records returned.
   */
  global Integer totalPromptRecords;

}