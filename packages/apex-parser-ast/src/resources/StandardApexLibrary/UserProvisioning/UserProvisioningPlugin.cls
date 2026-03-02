/**
 * The UserProvisioningPlugin base class implements Process.Plugin for programmatic customization of the user provisioning process for connected apps.
 */
public class UserProvisioningPlugin {

  /**
   * Use this method to add more input and output parameters to those defined in the base class.
   * @return Process.PluginDescribeResult
   */
  public Process.PluginDescribeResult buildDescribeCall() {}

  /**
   * Returns a Process.PluginDescribeResult object that describes this method call.
   * @return Process.PluginDescribeResult
   */
  public Process.PluginDescribeResult describe() {}

  /**
   * Returns the name of the class implementing the plugin.
   * @return String
   */
  public String getPluginClassName() {}

  /**
   * Primary method that the system invokes when the class that implements the interface is instantiated.
   * @param request 
   * @return Process.PluginResult
   */
  public Process.PluginResult invoke(Process.PluginRequest request) {}

}