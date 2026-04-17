/**
 * Create or update extensions associated with a feed element.
 */
global class ExtensionsCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * List of extensions to associate with the feed element.
   */
  global List < ConnectApi.ExtensionInput > itemsToAdd;

  /**
   * List of attachment IDs to remove from the feed element.
   */
  global List < String > itemsToRemove;

}