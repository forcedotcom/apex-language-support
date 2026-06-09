/**
 * Use the methods of the Search class to perform dynamic SOSL queries.
 */
global class Search {

  global Search() {}

  /**
   * Performs a dynamic SOSL query that can include the SOSL WITH SNIPPET clause. Snippets provide more context for users in Salesforce Knowledge article search results.
   * @param searchQuery A SOSL query string.
   * @return Search.SearchResults
   */
  global static Search.SearchResults find(String searchQuery) {}

  /**
   * Performs a dynamic SOSL query that can include the SOSL WITH SNIPPET clause. Snippets provide more context for users in Salesforce Knowledge article search results.
   * @param searchQuery A SOSL query string.
   * @param accessLevel 
   * @return Search.SearchResults
   */
  global static Search.SearchResults find(String searchQuery, System.AccessLevel accessLevel) {}

  /**
   * Performs a dynamic SOSL query.
   * @param query A SOSL query string.
   * @return sObject[sObject[]]
   */
  global static sObject[sObject[]] query(String query) {}

  /**
   * Performs a dynamic SOSL query.
   * @param query A SOSL query string.
   * @param accessLevel 
   * @return List<List<SObject>>
   */
  global static List<List<SObject>> query(String query, System.AccessLevel accessLevel) {}

  /**
   * Returns a list of records or Salesforce Knowledge articles whose names or titles match the user’s search query string. Use this method to provide users with shortcuts to navigate to relevant records or articles before they perform a search.
   * @param searchQuery A SOSL query string.
   * @param sObjectType An sObject type.
   * @param suggestions 
   * @return Search.SuggestionResults
   */
  global static Search.SuggestionResults suggest(String searchQuery, String sObjectType, Search.SuggestionOption suggestions) {}

  /**
   * Returns a list of records or Salesforce Knowledge articles whose names or titles match the user’s search query string. Use this method to provide users with shortcuts to navigate to relevant records or articles before they perform a search.
   * @param searchQuery A SOSL query string.
   * @param sObjectType An sObject type.
   * @param suggestions 
   * @param accessLevel 
   * @return Search.SuggestionResults
   */
  global static Search.SuggestionResults suggest(String searchQuery, String sObjectType, Search.SuggestionOption suggestions, System.AccessLevel accessLevel) {}

  global Object clone() {}

}