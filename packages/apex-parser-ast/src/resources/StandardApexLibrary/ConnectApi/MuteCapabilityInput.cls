/**
 * Mute or unmute a feed element.
 */
global class MuteCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * Indicates whether the feed element is muted for the context user. Default value is false .
   */
  global Boolean isMutedByMe;

}