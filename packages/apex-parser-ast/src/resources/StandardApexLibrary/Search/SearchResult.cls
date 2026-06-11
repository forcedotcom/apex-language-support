/**
 * A wrapper object that contains an sObject and search metadata.
 */
global class SearchResult {

  global SearchResult() {}

  /**
   * Returns an sObject from a SearchResult object.
   * @return SObject
   */
  global SObject getSObject() {}

  /**
   * Returns a snippet from a Case, Feed, or Knowledge Article SearchResult object based on the specified field name.
   * @param fieldName The field name to use for creating the snippet.
   * @return String
   */
  global String getSnippet(String fieldName) {}

  /**
   * Returns a snippet from a Case, Feed, or Knowledge Article SearchResult object based on the specified field name.
   * @return String
   */
  global String getSnippet() {}

  global Object clone() {}

}