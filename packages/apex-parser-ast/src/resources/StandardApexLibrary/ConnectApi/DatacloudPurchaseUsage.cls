/**
 * Information about Data.com point usage for monthly and list pool users.
 */
global class DatacloudPurchaseUsage {

  /**
   * The points or credits that are available in a pool of credits for your organization. This pool of credits can be used by any List Pool User in your organization.
   */
  global Integer listpoolCreditsAvailable;

  /**
   * The points or credits that have been used from a pool of credits that are used by List Pool Users to purchase records.
   */
  global Integer listpoolCreditsUsed;

  /**
   * The total credits that are assigned to a Monthly User. Unused credits expire at the end of each month.
   */
  global Integer monthlyCreditsAvailable;

  /**
   * The credits that are used by a Monthly User for the current month.
   */
  global Integer monthlyCreditsUsed;

}