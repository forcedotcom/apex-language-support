/**
 * Describes the input and output parameters for Process.PluginResult .
 */
global class PluginDescribeResult {

  global PluginDescribeResult() {}

  public String description;

  public List<Process.PluginDescribeResult.InputParameter> inputParameters;

  public String name;

  public List<Process.PluginDescribeResult.OutputParameter> outputParameters;

  global Object clone() {}

  /**
   * Describes the input parameter for Process.PluginResult .
   */
  global class InputParameter {

    global InputParameter() {}

    public String Description;

    public String Name;

    public Process.PluginDescribeResult.ParameterType ParameterType;

    public Boolean Required;

    global Object clone() {}

  }

  /**
   * Describes the output parameter for Process.PluginResult .
   */
  global class OutputParameter {

    global OutputParameter() {}

    public String Description;

    public String Name;

    public Process.PluginDescribeResult.ParameterType ParameterType;

    global Object clone() {}

  }

}