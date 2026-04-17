/**
 * Search request input for searching an object.
 */
global class SearchRequest {

  /**
   * Query term to search on. Query term must be two or more characters.
   */
  global String q;

  /**
   * Name of the search configuration to apply. Look up search configuration names from Search Manager.
   */
  global String configurationName;

  /**
   * List of data categories to filter.
   */
  global List < ConnectApi.SearchDataCategory > dataCategories;

  /**
   * List of fields to display and return in the search results. By default, the fields displayed are defined by the search layout.
   */
  global List < String > displayFields;

  /**
   * List of filters to apply.
   */
  global List < ConnectApi.SearchFilter > filters;

  /**
   * Specifies whether search generates a text highlight ( true ) or not ( false ). The default value is false .
   */
  global Boolean highlights;

  /**
   * Search page offset position. Default value is 0 , which indicates displaying results from the beginning without skipping any entries.
   */
  global Integer offset;

  /**
   * Order by input for object search.
   */
  global List < ConnectApi.SearchOrderBy > orderBy;

  /**
   * Number of results in a page. Valid values are from 1 through 1999. If unspecified the default value is 20 .
   */
  global Integer pageSize;

  /**
   * Specifies whether search should apply spellcheck ( true ) or not ( false ). The default value is true .
   */
  global Boolean spellcheck;

}