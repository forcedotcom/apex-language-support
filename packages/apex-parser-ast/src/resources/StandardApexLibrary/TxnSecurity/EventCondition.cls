/**
 * Allows an implementing class to specify whether to take action when certain events occur based on a transaction security policy. This interface is only used for Apex policies created in Real-Time Event Monitoring.
 */
global interface EventCondition {

  /**
   * Evaluates an event against a transaction security policy created in Real-Time Event Monitoring. If the event triggers the policy, the method returns true .
   * @param event 
   * @return Boolean
   */
  Boolean evaluate(SObject event);

}