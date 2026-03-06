/**
 * Managed content space channel.
 */
global class ManagedContentSpaceChannelRepresentation {

  /**
   * Information about the managed content space channel.
   */
  global ConnectApi.ManagedContentChannelSummary channelSummary;

  /**
   * Information about the user who created the managed content space channel.
   */
  global ConnectApi.ManagedContentUserSummary createdBy;

  /**
   * Date when the managed content space channel was created.
   */
  global Datetime createdDate;

  /**
   * Status of the add or remove operation for a channel and managed content space. Added —Channel was added to the managed content space. Failed —Add or remove operation failed. Pending —Add or remove operation is pending. Removed —Channel was removed from the managed content space.
   */
  global ConnectApi.ManagedContentSpaceChannelStatus status;

}