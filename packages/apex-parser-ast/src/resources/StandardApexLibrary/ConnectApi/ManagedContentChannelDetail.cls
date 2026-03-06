/**
 * Managed content channel detail.
 */
global class ManagedContentChannelDetail {

  /**
   * ID of the managed content channel.
   */
  global String channelId;

  /**
   * Name of the managed content channel.
   */
  global String channelName;

  /**
   * Type of managed content channel. Values are: CloudToCloud —Cloud-to-Cloud integrated channel. Community —Experience Cloud site channel. ConnectedApp —Channel served by a connected app. PublicUnauthenticated —Public channel. All published content is publicly available. UserPermission —Channel backed by a system permission. All published content is available only to users with the permission.
   */
  global ConnectApi.ManagedContentChannelType channelType;

  /**
   * Domain assigned to the managed content channel.
   */
  global String domain;

  /**
   * Name of the domain assigned to the managed content channel.
   */
  global String domainName;

  /**
   * Specifies whether the text of the channel's contents is searchable ( true ) or not ( false ).
   */
  global Boolean isChannelSearchable;

  /**
   * Specifies whether the channel’s domain is locked and can’t be changed ( true ) or not ( false ).
   */
  global Boolean isDomainLocked;

}