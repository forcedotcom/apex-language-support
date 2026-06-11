/**
 * Represents an iterator over a query locator record set.
 */
global class QueryLocatorIterator {

  global QueryLocatorIterator() {}

  /**
   * Returns true if there are one or more records remaining in the collection; otherwise, returns false .
   * @return Boolean
   */
  global Boolean hasNext() {}

  /**
   * Advances the iterator to the next sObject record and returns the sObject.
   * @return sObject
   */
  global sObject next() {}

  global Object clone() {}

}