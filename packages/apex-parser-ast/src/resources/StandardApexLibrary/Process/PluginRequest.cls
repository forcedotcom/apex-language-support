/**
 * Passes input parameters from the class that implements the Process.Plugin interface to the flow.
 */
global class PluginRequest {

  global PluginRequest() {}

  public Map<String,Object> inputParameters;

  global Object clone() {}

}