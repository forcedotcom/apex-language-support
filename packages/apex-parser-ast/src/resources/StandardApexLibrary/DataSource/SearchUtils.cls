/**
 * Helper class for implementing search on a custom adapter for Salesforce Connect.
 */
global class SearchUtils {

  /**
   * Queries all the tables and returns each row whose designated name field contains the search phrase.
   * @param searchDetails The SearchContext class that specifies which data to search and what to search for.
   * @param connection The DataSource.Connection class that connects to the external system.
   * @return List<DataSource.TableResult>
   */
  public static List<DataSource.TableResult> searchByName(DataSource.SearchContext searchDetails, DataSource.Connection connection) {}

}