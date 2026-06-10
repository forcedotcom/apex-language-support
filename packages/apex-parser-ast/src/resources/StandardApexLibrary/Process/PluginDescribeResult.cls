/**
 * Describes the input and output parameters for Process.PluginResult .
 */
global class PluginDescribeResult {

  global PluginDescribeResult() {}

  global String description;

  global List<Process.PluginDescribeResult.InputParameter> inputParameters;

  global String name;

  global List<Process.PluginDescribeResult.OutputParameter> outputParameters;

  global Object clone() {}

  /**
   * Describes the input parameter for Process.PluginResult .
   */
  global class InputParameter {

    global InputParameter() {}

    global String Description;

    global String Name;

    global Process.PluginDescribeResult.ParameterType ParameterType;

    global Boolean Required;

    global Object clone() {}

  }

  /**
   * Describes the output parameter for Process.PluginResult .
   */
  global class OutputParameter {

    global OutputParameter() {}

    global String Description;

    global String Name;

    global Process.PluginDescribeResult.ParameterType ParameterType;

    global Object clone() {}

  }

}