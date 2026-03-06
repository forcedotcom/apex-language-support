/**
 * A key-value pair to fill in a binding variable value from an action link template.
 */
global class ActionLinkTemplateBindingInput {

  /**
   * The name of the binding variable key specified in the action link template in Setup. For example, if the binding variable in the template is {!Binding.firstName} , the key is firstName
   */
  global String key;

  /**
   * The value of the binding variable key. For example, if the key is firstName , this value could be Joan .
   */
  global String value;

}