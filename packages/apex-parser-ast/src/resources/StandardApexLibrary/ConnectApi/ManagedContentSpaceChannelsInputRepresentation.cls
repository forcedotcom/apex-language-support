/**
 * Channels to add or remove from the managed content space.
 */
global class ManagedContentSpaceChannelsInputRepresentation {

  global ManagedContentSpaceChannelsInputRepresentation() {}

  /**
   * List of channels to add or remove from the managed content space.
   */
  global List < ConnectApi.ManagedContentSpaceChannelInputRepresentation > spaceChannels;

  global Object clone() {}

}