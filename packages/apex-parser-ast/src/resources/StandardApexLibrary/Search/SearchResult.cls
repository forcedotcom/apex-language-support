/**
 * A wrapper object that contains an sObject and search metadata.
 */
public class SearchResult {

  /**
   * Returns an sObject from a SearchResult object.
   * @return SObject
   */
  public SObject getSObject() {}

  /**
   * Returns a snippet from a Case, Feed, or Knowledge Article SearchResult object based on the specified field name.
   * @param fieldName The field name to use for creating the snippet.
   * @return String
   */
  public String getSnippet(String fieldName) {}

  /**
   * Returns a snippet from a Case, Feed, or Knowledge Article SearchResult object based on the specified field name.
   * @return String
   */
  public String getSnippet() {}

}