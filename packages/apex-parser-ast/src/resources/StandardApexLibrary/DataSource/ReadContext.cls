/**
 * Abstract base class for the QueryContext and SearchContext classes.
 */
global class ReadContext {

  global ReadContext() {}

  public Integer maxResults;

  public List<DataSource.Table> metadata;

  public Integer offset;

  global Object clone() {}

}