/**
 * Represents the record set returned by Database.getQueryLocator and used with Batch Apex.
 */
public class QueryLocator {

  /**
   * Returns the query used to instantiate the Database.QueryLocator object. This is useful when testing the start method.
   * @return String
   */
  public String getQuery() {}

  /**
   * Returns a new instance of a query locator iterator.
   * @return Database.QueryLocatorIterator
   */
  public Database.QueryLocatorIterator iterator() {}

}