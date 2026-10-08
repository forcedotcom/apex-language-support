/**
 * Passes input parameters from the class that implements the Process.Plugin interface to the flow.
 */
global class PluginRequest {
    /**
     * Input parameters that are passed from the class that implements the Process.Plugin interface to the flow.
     * Map<String, Object>
     */
    global final Map inputParameters { get; }

    global PluginRequest(Map inputParameters) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}