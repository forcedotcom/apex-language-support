/**
 * Allows you to pass data between your organization and a specified flow.
 */
public interface Plugin {

  /**
   * Returns a Process.PluginDescribeResult object that describes this method call.
   * @return Process.PluginDescribeResult
   */
  Process.PluginDescribeResult describe();

  /**
   * Primary method that the system invokes when the class that implements the interface is instantiated.
   * @param request 
   * @return Process.PluginResult
   */
  Process.PluginResult invoke(Process.PluginRequest request);

}