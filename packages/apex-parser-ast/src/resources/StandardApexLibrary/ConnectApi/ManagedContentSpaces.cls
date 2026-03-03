/**
 * Get channels in a managed content space. Add or remove channels from a managed content space.
 */
global class ManagedContentSpaces {

  public static ConnectApi.ManagedContentSpace getManagedContentSpace(String contentSpaceId) {}

  public static ConnectApi.ManagedContentSpaceChannelsRepresentation getManagedContentSpaceChannels(String contentSpaceId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ManagedContentSpaceCollectionRepresentation getManagedContentSpaces(Integer pageParam, Integer pageSize, String nameFragment) {}

  public static ConnectApi.ManagedContentSpace patchManagedContentSpace(String contentSpaceId, ConnectApi.ManagedContentSpaceUpdateInput ManagedContentSpaceUpdateInput) {}

  public static ConnectApi.ManagedContentSpaceChannelsRepresentation patchManagedContentSpaceChannels(String contentSpaceId, ConnectApi.ManagedContentSpaceChannelsInputRepresentation spaceChannels) {}

  public static ConnectApi.ManagedContentSpace postManagedContentSpace(ConnectApi.ManagedContentSpaceInput ManagedContentSpaceInput) {}

}