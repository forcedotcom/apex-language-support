/**
 * Channel to add or remove from a managed content space.
 */
global class ManagedContentSpaceChannelInputRepresentation {

  /**
   * ID of the channel to add or remove from the managed content space.
   */
  global String channelId;

  /**
   * Operation to perform on the channel and managed content space. Add —Add a channel to a managed content space. Remove —Remove a channel from a managed content space.
   */
  global ConnectApi.ManagedContentSpaceChannelOperation operation;

}