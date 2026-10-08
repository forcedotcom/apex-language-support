/**
 * Allows you to pass data between your organization and a specified flow.
 */
global interface Plugin {
    /**
     * Returns a Process.PluginDescribeResult object that describes this method call.
     */
    abstract Process.PluginDescribeResult describe();

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Primary method that the system invokes when the class that implements the interface is instantiated.
     */
    abstract Process.PluginResult invoke(Process.PluginRequest request);

    virtual String toString();
}