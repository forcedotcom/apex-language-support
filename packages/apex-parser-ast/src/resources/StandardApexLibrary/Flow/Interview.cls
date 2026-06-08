/**
 * The Flow.Interview class provides advanced controller access to flows and the ability to start a flow.
 */
global class Interview {

  global Interview() {}

  public static Flow.Interview createInterview(String namespace, String flowName, Map<String,Object> inputVariables) {}

  public static Flow.Interview createInterview(String flowName, Map<String,Object> inputVariables) {}

  public Object getVariableValue(String variableName) {}

  public void start() {}

  global Object clone() {}

}