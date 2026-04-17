/**
 * If a feed element has this capability, it has a group of other feed elements aggregated into one feed element called a bundle . This type of bundle aggregates feed tracked changes.
 */
global class TrackedChangeBundleCapability extends ConnectApi.BundleCapability {

  /**
   * Collection of feed tracked changes.
   */
  global List < ConnectApi.TrackedChangeItem > changes;

}