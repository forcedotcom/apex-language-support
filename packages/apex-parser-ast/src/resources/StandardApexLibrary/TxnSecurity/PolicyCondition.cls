/**
 * Apex interface that allows an implementing class to specify actions to take when certain events occur based on a transaction security policy.
 */
global interface PolicyCondition {

  /**
   * Evaluates an event against a transaction security policy. If the event triggers the policy, true is returned.
   * @param event The event to check against the transaction security policy.
   * @return Boolean
   */
  Boolean evaluate(TxnSecurity.Event event);

}