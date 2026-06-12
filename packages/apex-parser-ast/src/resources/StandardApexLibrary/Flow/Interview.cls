/**
 * The Flow.Interview class provides advanced controller access to flows and the ability to start a flow.
 */
global class Interview {

  global Interview() {}

  global static Flow.Interview createInterview(String namespace, String flowName, Map<String,Object> inputVariables) {}

  global static Flow.Interview createInterview(String flowName, Map<String,Object> inputVariables) {}

  global Object getVariableValue(String variableName) {}

  global void start() {}

  global Object clone() {}

}