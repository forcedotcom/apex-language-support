/**
 * The Flow.Interview class provides advanced controller access to flows and the ability to start a flow.
 * Usage
 * SOQL and DML limits apply during flow execution. See <a class="xref" href="https://help.salesforce.com/articleView?id=flow_considerations_limit_transaction.htm&amp;language=en_US" target="_blank">Per-Transaction Flow Limits</a> in Salesforce Help.
 * To create an Interview object, you have two options.
 * Note
 * We recommend only using createInterview() if you must reuse your method or class. Using createInterview() has these drawbacks.
 * If you package a class that uses createInterview(), you have to add the associated flow manually.
 * If you delete a flow, Salesforce doesn't check if it's referenced with createInterview().
 * Create the object directly in your class by using:
 * No namespace: Flow.Interview.flowName
 * Namespace: Flow.Interview.namespace.flowName
 * Create the object dynamically by using createInterview()
 * To enforce sharing rules, run the flow or Apex on API version 62.0 or later. The Apex class must be declared using the with sharing keyword. The flow runs more securely in the default context when an Apex class that’s declared using the with sharing keyword launches an autolaunched flow. The flow enforces the sharing rules of the user that executes the Apex class. Data access is restricted to the sharing rules of the user that executed the Apex class. For example, a query can return fewer rows than it did in system context without sharing. An operation can fail because the user doesn’t have the correct permissions.
 * Examples: Starting Flow Interviews
 * These examples are all sample controllers that start an interview for the flow from the <a class="xref" href="https://trailhead.salesforce.com/projects/flow_calculate" target="_blank">Build a Discount Calculator</a> project on Trailhead. Each shows a different permutation, based on:
 * Whether the interview is created statically, with Flow.Interview.myFlow, or dynamically, with createInterview().
 * Whether the flow is managed or local.
 * Interview Created Statically for a Local Flow
 * {
 *   Map<String, Object> inputs = new Map<String, Object>();
 *   inputs.put('AccountID', myAccount);
 *   inputs.put('OpportunityID', myOppty);
 *
 *   Flow.Interview.Calculate_discounts myFlow =
 *     new Flow.Interview.Calculate_discounts(inputs);
 *   myFlow.start();
 * }
 * Interview Created Dynamically for a Local Flow
 * public void callFlow(String flowName, Map <String, Object> inputs) {
 *   Flow.Interview myFlow = Flow.Interview.createInterview(flowName, inputs);
 *   myFlow.start();
 * }
 * Interview Created Statically for a Managed Flow
 * {
 *   Map<String, Object> inputs = new Map<String, Object>();
 *   inputs.put('AccountID', myAccount);
 *   inputs.put('OpportunityID', myOppty);
 *
 *   Flow.Interview.myNamespace.Calculate_discounts myFlow =
 *     new Flow.Interview.myNamespace.Calculate_discounts(inputs);
 *   myFlow.start();
 * }
 * Interview Created Dynamically for a Managed Flow
 * public void callFlow(String namespace, String flowName, Map <String, Object> inputs) {
 *   Flow.Interview myFlow = Flow.Interview.createInterview(namespace, flowName, inputs);
 *   myFlow.start();
 * }
 * Example: Getting Variable Values
 * This sample uses the getVariableValue method to obtain breadcrumb (navigation) information from a flow. If that flow contains subflow elements, and each of the referenced flows also contains a vaBreadCrumb variable, you can provide users with breadcrumbs regardless of which flow the interview is running.
 * public with sharing class SampleController {
 *
 *    //Instance of the flow
 *    public Flow.Interview.Flow_Template_Gallery myFlow {get; set;}
 *
 *    public String getBreadCrumb() {
 *       String aBreadCrumb;
 *       if (myFlow==null) { return 'Home';}
 *       else aBreadCrumb = (String) myFlow.getVariableValue('vaBreadCrumb');
 *
 *       return(aBreadCrumb==null ? 'Home': aBreadCrumb);
 *
 *    }
 * }
 */
global abstract class Interview {
    /**
     * Creates an interview for a flow.
     * Usage
     * Use this method to dynamically create a Flow.Interview object for the start() method.
     * How you get output variable values from an interview depends on the type of the Apex variable where you're storing the interview.
     * If the variable is cast to a specific flow, you can use myFlow.myVar to access a variable, where myVar is the name of the variable.
     * system.debug('My Output Variable: ' + myFlow.varName);
     * If the variable is of type Flow.Interview but not cast to a specific flow, you must use getVariableValue() to access the flow's variables.
     * system.debug('My Output Variable: ' + myFlow.getVariableValue('varName'));
     * If the flow doesn't exist in the current org, a TypeException is thrown.
     */
    global static Flow.Interview createInterview(String flowName, Map inputVariables) { return null; }

    global static Flow.Interview createInterview(String namespace, String flowName, Map inputVariables) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the value of the specified flow variable. The flow variable can be in the flow embedded in the Visualforce page, or in a separate flow that is called by a subflow element.
     * Usage
     * The returned variable value comes from whichever flow the interview is running. If the specified variable can't be found in that flow, the method returns null.
     * This method checks for the existence of the variable at run time only, not at compile time.
     */
    global Object getVariableValue(String variableName) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Starts an instance (interview) for an autolaunched or user provisioning flow.
     * Usage
     * This method can be used only with flows that have one of these types.
     * Autolaunched Flow
     * User Provisioning Flow
     * For details, see “<a class="xref" href="https://help.salesforce.com/articleView?id=flow_concepts_type.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Flow Types</a>” in Salesforce Help.
     * When a flow user invokes an autolaunched flow, the active flow version runs. If there’s no active version, the latest version runs. When a flow admin invokes a flow, the latest version always runs.
     */
    global void start() { }

    global override virtual String toString() { return null; }
}