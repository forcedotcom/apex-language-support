/**
 * Returns output parameters from the class that implements the Process.Plugin interface to the flow.
 */
global class PluginResult {

  global PluginResult() {}

  public Map<String, Object> outputParameters;

  global Object clone() {}

}