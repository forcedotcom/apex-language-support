/**
 * Abstract base class for the QueryContext and SearchContext classes.
 */
global class ReadContext {

  global ReadContext() {}

  global Integer maxResults;

  global List<DataSource.Table> metadata;

  global Integer offset;

  global Object clone() {}

}