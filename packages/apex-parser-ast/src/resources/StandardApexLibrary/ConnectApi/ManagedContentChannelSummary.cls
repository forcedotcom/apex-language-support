/**
 * Managed content channel.
 */
global class ManagedContentChannelSummary extends ConnectApi.AbstractManagedContentChannelRepresentation {

  /**
   * Domain URL of the channel.
   */
  global String domainUrl;

  /**
   * ID of the managed content channel.
   */
  global String id;

  /**
   * Name of the managed content channel.
   */
  global String name;

  /**
   * Resource URL to complete information of the channel.
   */
  global String resourceUrl;

  /**
   * Target site associated with the channel.
   */
  global ConnectApi.ManagedContentChannelTargetSummary target;

  /**
   * Type of managed content channel. Values are: CloudToCloud —Cloud-to-Cloud integrated channel. Community —Experience Cloud site channel. ConnectedApp —Channel served by a connected app. PublicUnauthenticated —Public channel. All published content is publicly available. UserPermission —Channel backed by a system permission. All published content is available only to users with the permission.
   */
  global ConnectApi.ManagedContentChannelType type;

  /**
   * URL to the channel resource.
   */
  global String url;

}