/**
 * Summary information about a list of records in the organization including custom objects.
 */
global class RecordSummaryList {

  /**
   * A list of records.
   */
  global List < ConnectApi.ActorWithId > records;

  /**
   * The URL to this list of records.
   */
  global String url;

}