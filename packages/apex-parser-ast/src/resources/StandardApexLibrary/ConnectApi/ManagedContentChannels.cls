/**
 * Get managed content channels. Create, get, update, or delete a managed content channel.
 */
global class ManagedContentChannels {

  public static void deleteManagedContentChannel(String channelId) {}

  public static ConnectApi.ManagedContentChannel getManagedContentChannel(String channelId) {}

  public static ConnectApi.ManagedContentChannelsRepresentation getManagedContentChannels(Integer pageParam, Integer pageSize, Boolean showDetails) {}

  public static ConnectApi.ManagedContentChannel patchManagedContentChannel(String channelId, ConnectApi.ManagedContentChannelUpdateRepresentation ManagedContentChannelInput) {}

  public static ConnectApi.ManagedContentChannel postManagedContentChannel(ConnectApi.ManagedContentChannelCreateRepresentation ManagedContentCreateInputParam) {}

}