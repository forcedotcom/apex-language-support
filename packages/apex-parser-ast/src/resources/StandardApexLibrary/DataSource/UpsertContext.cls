/**
 * An instance of UpsertContext is passed to the upsertRows() method on your Datasource.Connection class. This class provides context information about the upsert request to the implementor of upsertRows() .
 */
global class UpsertContext {

  global UpsertContext() {}

  global List<Map<String,Object>> rows;

  global String tableSelected;

  global Object clone() {}

}