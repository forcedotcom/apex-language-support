/**
 * Contains methods to fetch records and to get the number of cursor rows returned from a SOQL query.
 */
global class Cursor {

  global Cursor() {}

  global static List<SObject> fetch(Integer position, Integer count) {}

  global static Integer getNumRecords() {}

  global Object clone() {}

}