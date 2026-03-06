/**
 * If a feed element has this capability, it has a container of feed elements called a bundle .
 */
global class BundleCapability {

  /**
   * Defines this feed element's bundle type. The bundle type determines what additional information appears in the bundle.
   */
  global ConnectApi.BundleType bundleType;

  /**
   * A collection of feed elements.
   */
  global ConnectApi.FeedElementPage page;

  /**
   * The total number of feed elements that this bundle aggregates.
   */
  global Integer totalElements;

}