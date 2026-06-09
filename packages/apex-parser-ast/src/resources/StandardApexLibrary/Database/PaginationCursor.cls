/**
 * This class represents a pagination cursor that can traverse a SOQL query result set. It contains methods that fetch rows by page. It also contains a method that returns the total number of rows in the result set.
 */
global class PaginationCursor {

  global PaginationCursor() {}

  global Integer fetchDeleted(Integer start, Integer pageSize) {}

  global Database.CursorFetchResult fetchPage(Integer start, Integer pageSize) {}

  global Integer getNumRecords() {}

  global Object clone() {}

}