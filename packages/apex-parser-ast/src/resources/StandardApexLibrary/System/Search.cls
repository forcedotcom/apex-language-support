/**
 * Use the methods of the Search class to perform dynamic SOSL queries.
 */
public class Search {

  /**
   * Performs a dynamic SOSL query that can include the SOSL WITH SNIPPET clause. Snippets provide more context for users in Salesforce Knowledge article search results.
   * @param searchQuery A SOSL query string.
   * @return Search.SearchResults
   */
  public static Search.SearchResults find(String searchQuery) {}

  /**
   * Performs a dynamic SOSL query.
   * @param query A SOSL query string.
   * @return sObject[sObject[]]
   */
  public static sObject[sObject[]] query(String query) {}

  /**
   * Returns a list of records or Salesforce Knowledge articles whose names or titles match the user’s search query string. Use this method to provide users with shortcuts to navigate to relevant records or articles before they perform a search.
   * @param searchQuery A SOSL query string.
   * @param sObjectType An sObject type.
   * @param suggestions 
   * @return Search.SuggestionResults
   */
  public static Search.SuggestionResults suggest(String searchQuery, String sObjectType, Search.SuggestionOption suggestions) {}

}