/**
 * Stores the output of the Get User Data from JSON String invocable action, which you can access in Flow Builder..
 */
global class JsonValueOutput {

  global JsonValueOutput(String stringValue, Boolean booleanValue, Integer integerValue, Double doubleValue, String jsonStringValue, String jsonArrayValue) {}

  global Boolean booleanValue;

  global Double doubleValue;

  global Integer integerValue;

  global String jsonArrayValue;

  global String jsonStringValue;

  global String stringValue;

  global Object clone() {}

}