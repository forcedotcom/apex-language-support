/**
 * Get managed content channels. Create, get, update, or delete a managed content channel.
 */
global class ManagedContentChannels {

  global ManagedContentChannels() {}

  global static void deleteManagedContentChannel(String channelId) {}

  global static ConnectApi.ManagedContentChannel getManagedContentChannel(String channelId) {}

  global static ConnectApi.ManagedContentChannelsRepresentation getManagedContentChannels(Integer pageParam, Integer pageSize, Boolean showDetails) {}

  global static ConnectApi.ManagedContentChannel patchManagedContentChannel(String channelId, ConnectApi.ManagedContentChannelUpdateRepresentation ManagedContentChannelInput) {}

  global static ConnectApi.ManagedContentChannel postManagedContentChannel(ConnectApi.ManagedContentChannelCreateRepresentation ManagedContentCreateInputParam) {}

  global Object clone() {}

}