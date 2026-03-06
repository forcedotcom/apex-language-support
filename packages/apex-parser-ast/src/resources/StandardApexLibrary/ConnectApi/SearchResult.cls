/**
 * Results from searching an object using keywords.
 */
global class SearchResult {

  /**
   * Object API name.
   */
  global String apiName;

  /**
   * Content chunks for the search result.
   */
  global List < ConnectApi.Chunk chunks;

  /**
   * Field values by field API
   */
  global Map < String , ConnectApi.RecordFieldValue > fields;

  /**
   * ID of the record.
   */
  global String id;

  /**
   * Search information related to the search result.
   */
  global ConnectApi.MatchInfo matchInfo;

  /**
   * Source URL from where the record originated.
   */
  global String sourceUrl;

}