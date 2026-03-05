/**
 * An instance of SearchContext is provided to the search method on your DataSource.Connection class. The instance corresponds to a search or SOSL request.
 */
global class SearchContext {

  public SearchContext(List<DataSource.Table> metadata, Integer offset, Integer maxResults, List<DataSource.TableSelection> tableSelections, String searchPhrase) {}

}