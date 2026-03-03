/**
 * Wraps the results returned by the Search.find(String​) method.
 */
global class SearchResults {

  /**
   * Returns a list of Search.SearchResult objects that contain an sObject of the specified type.
   * @param sObjectType The name of an sObject in the dynamic SOSL query passed to the Search.find( String ) method.
   * @return List<Search.SearchResult>
   */
  public List<Search.SearchResult> get(String sObjectType) {}

}