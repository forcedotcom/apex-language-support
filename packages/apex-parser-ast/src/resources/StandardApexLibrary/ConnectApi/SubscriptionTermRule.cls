/**
 * Subscription term rules.
 */
global class SubscriptionTermRule {

  /**
   * Number of pricing term units that can be used to increase the subscription term.
   */
  global Integer increment;

  /**
   * Maximum number of pricing term units per subscription term.
   */
  global Integer maximum;

  /**
   * Minimum number of pricing term units per subscription term.
   */
  global Integer minimum;

}