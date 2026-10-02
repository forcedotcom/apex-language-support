/**
 * Contains methods to create, update, and retrieve information about invocable actions.
 * <p>Usage
 * The getDescribe() method returns detailed metadata about an invocable action, including its inputs, outputs, and configuration. Because this method retrieves comprehensive describe information, it can have performance implications. Use getDescribe() judiciously, especially in performance-sensitive contexts such as loops or frequently executed code paths.
 * When calling createStandardAction() or createCustomAction(), the version parameter is optional. If you don't specify a version, the base version of the action is used.
 * <p>Example
 * // Create an action and get its metadata
 * Invocable.Action action = Invocable.Action.createStandardAction('someActionName');
 * List<Invocable.Action.DescribeResult> describeResults = action.getDescribe();
 *
 * for (Invocable.Action.DescribeResult dr : describeResults) {
 *     System.debug('Action Name: ' + dr.getName());
 *     System.debug('Action Label: ' + dr.getLabel());
 *     System.debug('Description: ' + dr.getDescription());
 *     System.debug('Has Callout: ' + dr.getHasCallout());
 *
 *     // Access input parameters
 *     if (dr.getInputs() != null) {
 *         for (Invocable.Action.InputParameter input : dr.getInputs()) {
 *             System.debug('Input: ' + input.getName() + ' (' + input.getType() + ')');
 *             System.debug('Required: ' + input.getRequired());
 *             System.debug('Description: ' + input.getDescription());
 *         }
 *     }
 *
 *     // Access output parameters
 *     if (dr.getOutputs() != null) {
 *         for (Invocable.Action.OutputParameter output : dr.getOutputs()) {
 *             System.debug('Output: ' + output.getName() + ' (' + output.getType() + ')');
 *         }
 *     }
 * }
 */
global class Action {
    /**
     * Creates an empty invocation in preparation for calling an invocable action. After you create the invocation, you can add parameters to the invocation.
     */
    global Invocable.Action addInvocation() { return null; }

    /**
     * Clears the existing invocations from the action.
     */
    global Invocable.Action clearInvocations() { return null; }

    /**
     * Creates a wrapper for a custom invocable action.
     */
    global static Invocable.Action createCustomAction(String type, String name) { return null; }

    /**
     * Creates a wrapper for a custom invocable action in a specified package namespace.
     */
    global static Invocable.Action createCustomAction(String type, String namespace, String name) { return null; }

    /**
     * Creates a wrapper for the specified version of a custom invocable action in a specified package namespace.
     */
    global static Invocable.Action createCustomAction(String type, String namespace, String name, String version) { return null; }

    /**
     * Creates a wrapper for a standard invocable action.
     */
    global static Invocable.Action createStandardAction(String type) { return null; }

    /**
     * Creates a wrapper for a standard invocable action.
     */
    global static Invocable.Action createStandardAction(String type, String version) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets metadata related to an invocable action.
     */
    global List getDescribe() { return null; }

    /**
     * Gets the name of an invocable action.
     * @return Name of the invocable action.
     */
    global String getName() { return null; }

    /**
     * Gets the namespace of a custom invocable action.
     * @return Namespace of the custom invocable action.
     */
    global String getNamespace() { return null; }

    /**
     * Gets the type of an invocable action.
     * @return Type of invocable action.
     */
    global String getType() { return null; }

    /**
     * Gets the version of an invocable action.
     * @return Version of the invocable action.
     */
    global String getVersion() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Invokes an invocable action from Apex code.
     */
    global List invoke() { return null; }

    /**
     * Determines whether an invocable action is a standard invocable action.
     * @return This method returns true if the invocable action is a standard invocable action.
     */
    global Boolean isStandard() { return false; }

    /**
     * Sets a value for an invocable action parameter.
     */
    global Invocable.Action setInvocationParameter(String parameterName, Object parameterValue) { return null; }

    global Invocable.Action setInvocations(List invocations) { return null; }

    global override virtual String toString() { return null; }

    /**
     * Contains methods to get metadata about attributes associated with invocable action parameters.
     * <p>Usage
     * Additional attributes extend invocable action parameters with custom metadata beyond the standard parameter properties. Use the AdditionalAttribute class to access this extensibility metadata when working with invocable actions.
     * For type-safe access to collection values, use the typed getter methods such as getValueAsStringList(), getValueAsIntegerList(), getValueAsDoubleList(), or getValueAsBooleanList(). These methods return null when the requested data type doesn't match the attribute's actual data type. Check getDataType() and getIsCollection() before calling typed getters to ensure you use the appropriate method.
     * <p>Example
     * Invocable.Action action = Invocable.Action.createStandardAction('otherActionName');
     * List<Invocable.Action.DescribeResult> results = action.getDescribe();
     *
     * for (Invocable.Action.DescribeResult result : results) {
     *     for (Invocable.Action.InputParameter input : result.getInputs()) {
     *         List<Invocable.Action.AdditionalAttribute> attrs = input.getAdditionalAttributes();
     *         if (attrs != null) {
     *             for (Invocable.Action.AdditionalAttribute attr : attrs) {
     *                 System.debug('Attribute: ' + attr.getName());
     *                 System.debug('Data Type: ' + attr.getDataType());
     *
     *                 // Handle collection vs single value
     *                 if (attr.getIsCollection()) {
     *                     if (attr.getDataType() == 'STRING') {
     *                         List<String> stringValues = attr.getValueAsStringList();
     *                         System.debug('String Values: ' + stringValues);
     *                     }
     *                 } else {
     *                     System.debug('Value: ' + attr.getValue());
     *                 }
     *             }
     *         }
     *     }
     * }
     */
    global class AdditionalAttribute {
        global Invocable.Action.AdditionalAttribute clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets the Apex class name of an additional attribute for an invocable action parameter.
         * @return Apex class name of the additional attribute for the invocable action parameter.
         */
        global String getApexClass() { return null; }

        /**
         * Gets the data type of an additional attribute for an invocable action parameter.
         * @return Data type of the additional attribute for the invocable action parameter. For example: STRING, INTEGER, BOOLEAN, DOUBLE, LONG, DATE.
         */
        global String getDataType() { return null; }

        /**
         * Indicates whether an additional attribute for an invocable action parameter contains a collection of values.
         * @return This method returns true if the additional attribute for the invocable action parameter is a collection.
         */
        global Boolean getIsCollection() { return false; }

        /**
         * Gets the name of an additional attribute for an invocable action parameter.
         * @return Name of the additional attribute for the invocable action parameter.
         */
        global String getName() { return null; }

        /**
         * Gets the value for an additional attribute for an invocable action parameter.
         * @return Value of the additional attribute for the invocable action parameter. Cast to the appropriate type based on the dataType and isCollection.
         */
        global Object getValue() { return null; }

        /**
         * Returns a value as a list of Booleans when isCollection is true and dataType is BOOLEAN.
         * @return List of Boolean values, or null if not a Boolean collection.
         */
        global List getValueAsBooleanList() { return null; }

        /**
         * Returns a value as a list of dates when isCollection is true and dataType is DATE.
         * @return List of date values, or null if not a date collection.
         */
        global List getValueAsDateList() { return null; }

        /**
         * Returns a value as a list of doubles when isCollection is true and dataType is DOUBLE.
         * @return List of double values, or null if not a double collection.
         */
        global List getValueAsDoubleList() { return null; }

        /**
         * Returns a value as a list of integers when isCollection is true and dataType is INTEGER.
         * @return List of integer values, or null if not an integer collection.
         */
        global List getValueAsIntegerList() { return null; }

        global List getValueAsList() { return null; }

        /**
         * Returns a value as a list of longs when isCollection is true and dataType is LONG.
         * @return List of long values, or null if not a long collection.
         */
        global List getValueAsLongList() { return null; }

        /**
         * Returns a value as a list of strings when isCollection is true and dataType is STRING.
         * @return List of string values, or null if not a string collection.
         */
        global List getValueAsStringList() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods to get metadata about invocable actions.
     * <p>Example
     * Invocable.Action action = Invocable.Action.createStandardAction('otherActionName');
     * List<Invocable.Action.DescribeResult> results = action.getDescribe();
     *
     * for (Invocable.Action.DescribeResult result : results) {
     *     for (Invocable.Action.InputParameter input : result.getInputs()) {
     *         List<Invocable.Action.AdditionalAttribute> attrs = input.getAdditionalAttributes();
     *         if (attrs != null) {
     *             for (Invocable.Action.AdditionalAttribute attr : attrs) {
     *                 System.debug('Attribute: ' + attr.getName());
     *                 System.debug('Data Type: ' + attr.getDataType());
     *
     *                 // Handle collection vs single value
     *                 if (attr.getIsCollection()) {
     *                     if (attr.getDataType() == 'STRING') {
     *                         List<String> stringValues = attr.getValueAsStringList();
     *                         System.debug('String Values: ' + stringValues);
     *                     }
     *                 } else {
     *                     System.debug('Value: ' + attr.getValue());
     *                 }
     *             }
     *         }
     *     }
     * }
     */
    global class DescribeResult {
        global Invocable.Action.DescribeResult clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets the invocable action that was invoked and caused a result to be returned.
         */
        global Invocable.Action getAction() { return null; }

        /**
         * Indicates whether the invocable action allows transaction control.
         * @return This method returns true if the invocable action allows transaction control.
         */
        global Boolean getAllowsTransactionControl() { return false; }

        /**
         * Gets the capability types supported by an invocable action.
         * @return List of capability type identifiers of the invocable action.
         */
        global List getCapabilityTypes() { return null; }

        /**
         * Gets the category of an invocable action.
         * @return Category of the invocable action.
         */
        global String getCategory() { return null; }

        /**
         * Gets the type of an invocable action.
         * @return Configuration editor identifier of the invocable action.
         */
        global String getConfigurationEditor() { return null; }

        /**
         * Gets the description of an invocable action.
         * @return Description of the invocable action.
         */
        global String getDescription() { return null; }

        /**
         * Gets a list of the generic types defined for an invocable action.
         */
        global List getGenericTypes() { return null; }

        /**
         * Indicates whether an invocable action makes external callouts.
         * @return This method returns true if the invocable action makes external callouts.
         */
        global Boolean getHasCallout() { return false; }

        /**
         * Indicates whether an invocable action is a standard invocable action.
         * @return This method returns true if the invocable action has system-generated output.
         */
        global Boolean getHasSystemGeneratedOutput() { return false; }

        /**
         * Gets the icon ID for an invocable action.
         * @return Icon ID of the invocable action.
         */
        global String getIconId() { return null; }

        /**
         * Gets the icon name for an invocable action.
         * @return Icon name for the invocable action.
         */
        global String getIconName() { return null; }

        /**
         * Gets a list of input parameters for an invocable action.
         */
        global List getInputs() { return null; }

        /**
         * Gets the type of an invocable action.
         * @return Label of the invocable action.
         */
        global String getLabel() { return null; }

        /**
         * Gets the description of an invocable action method.
         * @return Describe of the invocable action method.
         */
        global String getMethodDescription() { return null; }

        /**
         * Gets the label of an invocable action method.
         * @return Label of the invocable action method.
         */
        global String getMethodLabel() { return null; }

        /**
         * Gets the name of an invocable action method.
         * @return Name of the invocable action method.
         */
        global String getMethodName() { return null; }

        /**
         * Gets the name of an invocable action.
         * @return Name of the invocable action.
         */
        global String getName() { return null; }

        /**
         * Gets a list of output parameters for an invocable action.
         */
        global List getOutputs() { return null; }

        /**
         * Gets the target entity name for an invocable action.
         * @return Target entity name of the invocable action.
         */
        global String getTargetEntityName() { return null; }

        /**
         * Gets the type of an invocable action.
         * @return Type of the invocable action.
         */
        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods to retrieve errors returned by invocable actions.
     */
    global class Error {
        /**
         * Creates a copy of the Invocable.Action.Error.
         */
        global Invocable.Action.Error clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets the error code returned by an invocable action.
         */
        global String getCode() { return null; }

        /**
         * Gets the error message returned by an invocable action.
         */
        global String getMessage() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods to get metadata about generic type parameters for invocable actions.
     */
    global class GenericType {
        global Invocable.Action.GenericType clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets the description of a generic type parameter of an invocable action.
         * @return Description of the generic type parameter of the invocable action.
         */
        global String getDescription() { return null; }

        /**
         * Gets the label of a generic type parameter of an invocable action.
         * @return Label of the generic type parameter of the invocable action.
         */
        global String getLabel() { return null; }

        /**
         * Gets the name of a generic type parameter of an invocable action.
         * @return Name of the generic type parameter of the invocable action.
         */
        global String getName() { return null; }

        /**
         * Gets the super type of a generic type parameter of an invocable action.
         * @return Super type of the generic type parameter of the invocable action.
         */
        global String getSuperType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods to get metadata about input parameters for invocable actions.
     * <p>Example
     * Invocable.Action action = Invocable.Action.createStandardAction('otherActionName');
     * List<Invocable.Action.DescribeResult> results = action.getDescribe();
     *
     * for (Invocable.Action.DescribeResult result : results) {
     *     for (Invocable.Action.InputParameter input : result.getInputs()) {
     *         List<Invocable.Action.AdditionalAttribute> attrs = input.getAdditionalAttributes();
     *         if (attrs != null) {
     *             for (Invocable.Action.AdditionalAttribute attr : attrs) {
     *                 System.debug('Attribute: ' + attr.getName());
     *                 System.debug('Data Type: ' + attr.getDataType());
     *
     *                 // Handle collection vs single value
     *                 if (attr.getIsCollection()) {
     *                     if (attr.getDataType() == 'STRING') {
     *                         List<String> stringValues = attr.getValueAsStringList();
     *                         System.debug('String Values: ' + stringValues);
     *                     }
     *                 } else {
     *                     System.debug('Value: ' + attr.getValue());
     *                 }
     *             }
     *         }
     *     }
     * }
     */
    global class InputParameter {
        global Invocable.Action.InputParameter clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets a list of additional attributes for an invocable action input parameter.
         */
        global List getAdditionalAttributes() { return null; }

        /**
         * Gets the Apex class name of an input parameter for an invocable action.
         * @return Apex class name of the input parameter of the invocable action.
         */
        global String getApexClass() { return null; }

        /**
         * Gets the maximum byte length of an input parameter of an invocable action.
         * @return Maximum byte length of the input parameter of the invocable action.
         */
        global Integer getByteLength() { return 0; }

        /**
         * Indicates whether an input parameter of an invocable action is a configuration parameter.
         * @return This method returns true if the input parameter of the invocable action is a configuration parameter.
         */
        global Boolean getConfiguration() { return false; }

        /**
         * Gets the default value for an input parameter of an invocable action.
         * @return The default value, or null if no default is defined.
         */
        global Object getDefaultValue() { return null; }

        /**
         * >Gets the description of an input parameter of an invocable action.
         * @return Description of the input parameter of the invocable action.
         */
        global String getDescription() { return null; }

        /**
         * Gets the label of an input parameter of an invocable action.
         * @return Label of the input parameter of the invocable action.
         */
        global String getLabel() { return null; }

        /**
         * Gets the maximum number of occurrences for an input parameter of an invocable action.
         * @return Maximum number of occurrences for the input parameter of the invocable action. If occurrences are unbounded, returns -1.
         */
        global Integer getMaxOccurs() { return 0; }

        /**
         * Gets the name of an input parameter of an invocable action.
         * @return Name of the input parameter of the invocable action.
         */
        global String getName() { return null; }

        /**
         * Gets a list of picklist values for an input parameter of an invocable action.
         */
        global List getPicklistValues() { return null; }

        /**
         * Gets the placeholder text of an input parameter of an invocable action.
         * @return Placeholder text of the input parameter of the invocable action.
         */
        global String getPlaceholderText() { return null; }

        /**
         * Indicates whether an input parameter of an invocable action is required.
         * @return This method returns true if the input parameter of the invocable action is required.
         */
        global Boolean getRequired() { return false; }

        /**
         * Gets the sObject type of an input parameter of an invocable action.
         * @return SObject type of the input parameter of the invocable action.
         */
        global String getSObjectType() { return null; }

        /**
         * Gets the setup reference types of an input parameter of an invocable action.
         * @return List of setup reference type identifiers of the input parameter of the invocable action.
         */
        global List getSetupReferenceType() { return null; }

        /**
         * Gets the tooling type of and input parameter of an invocable action.
         * @return Tooling type of the input parameter of the invocable action.
         */
        global String getToolingType() { return null; }

        /**
         * Gets the data type of an input parameter of an invocable action.
         * @return Data type of the input parameter of the invocable action.
         */
        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods about metadata returned by invocable actions.
     * <p>Example
     * Invocable.Action action = Invocable.Action.createStandardAction('otherActionName');
     * List<Invocable.Action.DescribeResult> results = action.getDescribe();
     *
     * for (Invocable.Action.DescribeResult result : results) {
     *     for (Invocable.Action.InputParameter input : result.getInputs()) {
     *         List<Invocable.Action.AdditionalAttribute> attrs = input.getAdditionalAttributes();
     *         if (attrs != null) {
     *             for (Invocable.Action.AdditionalAttribute attr : attrs) {
     *                 System.debug('Attribute: ' + attr.getName());
     *                 System.debug('Data Type: ' + attr.getDataType());
     *
     *                 // Handle collection vs single value
     *                 if (attr.getIsCollection()) {
     *                     if (attr.getDataType() == 'STRING') {
     *                         List<String> stringValues = attr.getValueAsStringList();
     *                         System.debug('String Values: ' + stringValues);
     *                     }
     *                 } else {
     *                     System.debug('Value: ' + attr.getValue());
     *                 }
     *             }
     *         }
     *     }
     * }
     */
    global class OutputParameter {
        global Invocable.Action.OutputParameter clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets a list of additional attributes for an invocable action output parameter.
         */
        global List getAdditionalAttributes() { return null; }

        /**
         * Gets the Apex class name of an output parameter for an invocable action.
         * @return Apex class name of the output parameter of the invocable action.
         */
        global String getApexClass() { return null; }

        /**
         * Gets the description of an output parameter of an invocable action.
         * @return Description of the output parameter of the invocable action.
         */
        global String getDescription() { return null; }

        /**
         * Gets the label of an output parameter of an invocable action.
         * @return Label of the output parameter of the invocable action.
         */
        global String getLabel() { return null; }

        /**
         * Gets the maximum number of occurrences for an output parameter of an invocable action.
         * @return Maximum number of occurrences for the output parameter of the invocable action. If occurrences are unbounded, returns -1.
         */
        global Integer getMaxOccurs() { return 0; }

        /**
         * Gets the name of an output parameter of an invocable action.
         * @return Name of the output parameter of the invocable action.
         */
        global String getName() { return null; }

        /**
         * Gets a list of picklist values for an output parameter of an invocable action.
         */
        global List getPicklistValues() { return null; }

        /**
         * Gets the sObject type of an output parameter of an invocable action.
         * @return SObject type of the output parameter of the invocable action.
         */
        global String getSObjectType() { return null; }

        /**
         * Gets the data type of an output parameter of an invocable action.
         * @return Data type of the output parameter of the invocable action.
         */
        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods to get metadata about a single value in a picklist used by invocable action parameters.
     * <p>Example
     * Invocable.Action action = Invocable.Action.createStandardAction('anotherActionName');
     * List<Invocable.Action.DescribeResult> describeResults = action.getDescribe();
     *
     * for (Invocable.Action.DescribeResult dr : describeResults) {
     *     for (Invocable.Action.InputParameter input : dr.getInputs()) {
     *         List<Invocable.Action.PicklistValue> picklistValues = input.getPicklistValues();
     *         if (picklistValues != null) {
     *             for (Invocable.Action.PicklistValue plv : picklistValues) {
     *                 System.debug('Label: ' + plv.getLabel());
     *                 System.debug('Value: ' + plv.getValue());
     *                 System.debug('Is Default: ' + plv.getDefaultValue());
     *                 System.debug('Is Active: ' + plv.getActive());
     *             }
     *         }
     *     }
     * }
     */
    global class PicklistValue {
        global Invocable.Action.PicklistValue clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Indicates whether a picklist value used by an invocable action parameter is active.
         * @return This method returns true if the picklist value for the invocable action parameter is active.
         */
        global Boolean getActive() { return false; }

        /**
         * Indicates whether a picklist value used by an invocable action parameter is the default value.
         * @return This method returns true if the picklist value used by the invocable action parameter is the default value.
         */
        global Boolean getDefaultValue() { return false; }

        /**
         * Gets the label of a picklist value used by an invocable action parameter.
         * @return Label of the picklist value used by the invocable action parameter.
         */
        global String getLabel() { return null; }

        /**
         * Gets the valid-for dependency information for a picklist value used by an invocable action parameter.
         * @return Valid-for dependency string of the picklist value used by the invocable action parameter, or null if no dependencies exist.
         */
        global String getValidFor() { return null; }

        /**
         * Gets the API value of a picklist option used by an invocable action parameter.
         * @return API value of the picklist option used by the invocable action parameter.
         */
        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains methods to retrieve results from invocable actions called from Apex code.
     */
    global class Result {
        /**
         * Creates a copy of the Invocable.Action.Result.
         */
        global Invocable.Action.Result clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets the invocable action that was invoked and caused a result to be returned.
         */
        global Invocable.Action getAction() { return null; }

        /**
         * Gets a list of errors that were returned by an invocable action.
         */
        global List getErrors() { return null; }

        /**
         * Gets a list of the parameter values set for an invocable action. This method returns a list that contains the input parameter values for each invocation of an action. Each map in the list contains a key for the name of each input parameter.
         */
        global Map getInvocationParameters() { return null; }

        /**
         * Gets a list of the parameter values returned by an invocable action. This method returns a list that contains the result for each invocation of an action. Each map in the list contains a key for the name of each output parameter.
         */
        global Map getOutputParameters() { return null; }

        global virtual Integer hashCode() { return 0; }

        /**
         * Determines if an invocable action ran without errors.
         * @return This method returns true if the invocable action ran successfully.
         */
        global Boolean isSuccess() { return false; }

        global override virtual String toString() { return null; }
    }
}