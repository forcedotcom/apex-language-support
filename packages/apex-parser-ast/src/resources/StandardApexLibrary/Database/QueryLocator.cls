/**
 * Represents the record set returned by Database.getQueryLocator and used with Batch Apex.
 */
global class QueryLocator {

  global QueryLocator() {}

  /**
   * Returns the query used to instantiate the Database.QueryLocator object. This is useful when testing the start method.
   * @return String
   */
  global String getQuery() {}

  /**
   * Returns a new instance of a query locator iterator.
   * @return Database.QueryLocatorIterator
   */
  global Database.QueryLocatorIterator iterator() {}

  global List<SObject> querymore(Integer num) {}

  global Object clone() {}

}