/**
 * Represents the parameters corresponding to a quick action.
 */
global class DescribeQuickActionParameter {
    /**
     * Describes the name of the parameter that can be associated with a specific quick action type. For example, User Utterance is a parameter that is associated with agent quick actions.
     * String
     */
    global String parametername { get; }
    /**
     * Describes the type of quick action. The type can either be Input or Output.
     * String
     */
    global String parametertype { get; }
    /**
     * Describes the value of the parameter associated with the quick action.
     * String
     */
    global String parametervalue { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the name of the parameter associated with the quick action.
     */
    global String getParameterName() { return null; }

    /**
     * Returns the type of the parameter associated with the quick action. This can either be Input or Output.
     */
    global String getParameterType() { return null; }

    /**
     * Returns the value of the parameter associated with the quick action.
     */
    global String getParameterValue() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}