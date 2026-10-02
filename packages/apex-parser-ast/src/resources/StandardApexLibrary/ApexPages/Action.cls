/**
 * You can use ApexPages.Action to create an action method that you can use in a Visualforce custom controller or controller extension.
 * <p>Usage
 * For example, you could create a saveOver method on a controller extension that performs a custom save.
 * <p>Instantiation
 * The following code snippet illustrates how to instantiate a new ApexPages.Action object that uses the save action:
 * ApexPages.Action saveAction = new ApexPages.Action('{!save}');
 */
global class Action {
    /**
     * Creates a new instance of the ApexPages.Action class using the specified action.
     */
    global Object Action(String expression) { return null; }

    /**
     * Returns the expression that is evaluated when the action is invoked.
     */
    global String getExpression() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Invokes the action.
     */
    global System.PageReference invoke() { return null; }

    global override virtual String toString() { return null; }
}