/**
 * Use the Function class to access deployed Salesforce Functions, and invoke them synchronously or asynchronously.
 */
global class Function {

  /**
   * Returns the Function instance for the named Function and Project. The Function must be properly deployed and have appropriate permissions to work with the org running your Apex code.
   * @param functionName The name of the Salesforce Function and the Functions Project that the Function is part of. The format of the parameter string is “ project name . function name ”. For example, to retrieve the generatepdf Function in the Onboarding Function Project, use Onboarding.generatepdf . The Function and Project must be deployed to a compute environment connected to the org.
   * @return functions.Function
   */
  public static functions.Function get(String functionName) {}

  /**
   * Returns the Function instance for the named Function and Project. The Function must be properly deployed and have appropriate permissions to work with the org running your Apex code.
   * @param namespace 
   * @param functionName The name of the Salesforce Function and the Functions Project that the Function is part of. The format of the parameter string is “ project name . function name ”. For example, to retrieve the generatepdf Function in the Onboarding Function Project, use Onboarding.generatepdf . The Function and Project must be deployed to a compute environment connected to the org.
   * @return functions.Function
   */
  public static functions.Function get(String namespace, String functionName) {}

  /**
   * Invokes the Function asynchronously.
   * @param payload The payload data that gets passed to the Function. Specify your payload data in a JSON-format string.
   * @param callback A FunctionCallback implementation that gets called when your Function is invoked asynchronously.
   * @return functions.FunctionInvocation
   */
  public functions.FunctionInvocation invoke(String payload, functions.FunctionCallback callback) {}

  /**
   * Invokes the Function asynchronously.
   * @param payload The payload data that gets passed to the Function. Specify your payload data in a JSON-format string.
   * @return functions.FunctionInvocation
   */
  public functions.FunctionInvocation invoke(String payload) {}

}