/**
 * Stores the output of the Get User Data from JSON String invocable action, which you can access in Flow Builder..
 */
global class JsonValueOutput {

  public JsonValueOutput(String stringValue, Boolean booleanValue, Integer integerValue, Double doubleValue, String jsonStringValue, String jsonArrayValue) {}

  public Boolean booleanValue;

  public Double doubleValue;

  public Integer integerValue;

  public String jsonArrayValue;

  public String jsonStringValue;

  public String stringValue;

  global Object clone() {}

}