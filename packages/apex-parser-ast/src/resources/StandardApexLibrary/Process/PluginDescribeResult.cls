/**
 * Describes the input and output parameters for Process.PluginResult.
 */
global class PluginDescribeResult {
    /**
     * This optional field describes the purpose of the plug-in.
     * Usage
     * Size limit: 255 characters.
     * String
     */
    global String description { get; set; }
    /**
     * The input parameters passed by the Process.PluginRequest class from a flow to the class that implements the Process.Plugin interface.
     * List<Process.PluginDescribeResult.InputParameter>
     */
    global List inputParameters { get; set; }
    /**
     * Unique name of the plug-in.
     * Usage
     * Size limit: 40 characters.
     * String
     */
    global String name { get; set; }
    /**
     * The output parameters passed by the Process.PluginResult class from the class that implements the Process.Plugin interface to the flow.
     * List<Process.PluginDescribeResult.OutputParameter>
     */
    global List outputParameters { get; set; }
    global String tag { get; set; }

    /**
     * Creates a new instance of the Process.PluginDescribeResult class.
     */
    global PluginDescribeResult() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    /**
     * Describes the input parameter for Process.PluginResult.
     */
    global class InputParameter {
        /**
         * This optional field describes the purpose of the plug-in.
         * Usage
         * Size limit: 255 characters.
         * String
         */
        global final String description { get; }
        /**
         * Unique name of the plug-in.
         * Usage
         * Size limit: 40 characters.
         * String
         */
        global final String name { get; }
        /**
         * The data type of the input parameter.
         * Process.PluginDescribeResult.ParameterType
         */
        global final Process.PluginDescribeResult.ParameterType parameterType { get; }
        /**
         * Set to true for required and false otherwise.
         * Boolean
         */
        global final Boolean required { get; }

        /**
         * Creates a new instance of the Process.PluginDescribeResult.InputParameter class using the specified name, parameter type, and required option.
         */
        global InputParameter(String name, Process.PluginDescribeResult.ParameterType parameterType, Boolean required) { }

        /**
         * Creates a new instance of the Process.PluginDescribeResult.InputParameter class using the specified name, description, parameter type, and required option.
         */
        global InputParameter(String name, String description, Process.PluginDescribeResult.ParameterType parameterType, Boolean required) { }

        global Process.PluginDescribeResult.InputParameter clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Describes the output parameter for Process.PluginResult.
     */
    global class OutputParameter {
        /**
         * This optional field describes the purpose of the plug-in.
         * Usage
         * Size limit: 255 characters.
         * String
         */
        global final String description { get; }
        /**
         * Unique name of the plug-in.
         * Usage
         * Size limit: 40 characters.
         * String
         */
        global final String name { get; }
        /**
         * The data type of the output parameter.
         * Process.PluginDescribeResult.ParameterType
         */
        global final Process.PluginDescribeResult.ParameterType parameterType { get; }

        /**
         * Creates a new instance of the Process.PluginDescribeResult.OutputParameter class using the specified name, description, and parameter type.
         */
        global OutputParameter(String name, Process.PluginDescribeResult.ParameterType parameterType) { }

        /**
         * Creates a new instance of the Process.PluginDescribeResult.OutputParameter class using the specified name, description, and parameter type.
         */
        global OutputParameter(String name, String description, Process.PluginDescribeResult.ParameterType parameterType) { }

        global Process.PluginDescribeResult.OutputParameter clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Specifies the data types of input and output parameters of the Process.PluginDescribeResult class.
     * Enum Values
     * The following are the values of the Process.PluginDescribeResult.ParameterType enum.
     */
    global enum ParameterType {
        BOOLEAN,
        DATE,
        DATETIME,
        DECIMAL,
        DOUBLE,
        FLOAT,
        ID,
        INTEGER,
        LONG,
        STRING,
        TIME

    }
}