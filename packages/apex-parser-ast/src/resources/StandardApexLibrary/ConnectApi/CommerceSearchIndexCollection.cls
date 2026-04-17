/**
 * Collection of indexes.
 */
global class CommerceSearchIndexCollection {

  /**
   * List of up to two indexes. Returns the completed, live index and either the in-progress, out-of-use index or the most-recently-failed, out-of-use index.
   */
  global List < ConnectApi.CommerceSearchIndex > indexes;

}