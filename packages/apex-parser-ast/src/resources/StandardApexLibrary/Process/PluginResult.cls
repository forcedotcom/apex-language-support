/**
 * Returns output parameters from the class that implements the Process.Plugin interface to the flow.
 */
global class PluginResult {
    /**
     * Output parameters returned from the class that implements the interface to the flow.
     * <p>Map<String, Object>
     */
    global Map outputParameters { get; set; }

    global Object PluginResult(Map outputParameters) { return null; }

    global Object PluginResult(String outputKey, Object outputValue) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}