global with sharing class SparkPlugApi {
    global Object SparkPlugApi() { return null; }

    global static webservice Process.SparkPlugApi.SparkPlugDescribeResult describePlugin(String className) { return null; }

    global static webservice List describePlugins() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static webservice String invokePluginWithJson(String className, String parameters) { return null; }

    global override virtual String toString() { return null; }

    global class SparkPlugDescribeResult {
        global webservice List inputParameters;
        global webservice String name;
        global webservice List outputParameters;

        global Object SparkPlugDescribeResult() { return null; }

        global Process.SparkPlugApi.SparkPlugDescribeResult clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    global class SparkPlugParameter {
        global webservice String name;
        global webservice String parameterType;
        global webservice Boolean required;

        global Object SparkPlugParameter() { return null; }

        global Process.SparkPlugApi.SparkPlugParameter clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}