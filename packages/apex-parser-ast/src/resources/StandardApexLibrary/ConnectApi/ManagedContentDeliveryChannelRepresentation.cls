/**
 * Managed content delivery channel.
 */
global class ManagedContentDeliveryChannelRepresentation {

  /**
   * Domain assigned to the managed content channel.
   */
  global String domain;

  /**
   * Name of the domain assigned to the managed content channel.
   */
  global String domainName;

  /**
   * ID of the managed content channel.
   */
  global String id;

  /**
   * Specifies whether the channel has off-core dedicated content delivery enabled ( true ) or not ( false ). Orgs hosted on Hyperforce use off-core dedicated content delivery to deliver content in public channels with high performance and low latency.
   */
  global Boolean isDedicatedContentDelivery;

  /**
   * Specifies whether the channel’s domain is locked and can’t be changed ( true ) or not ( false ).
   */
  global Boolean isDomainLocked;

  /**
   * Specifies whether the text of the channel's contents is searchable ( true ) or not ( false ).
   */
  global Boolean isSearchable;

  /**
   * Name of the managed content channel.
   */
  global String name;

  /**
   * Type of managed content channel. Values are: CloudToCloud —Cloud-to-Cloud integrated channel. Community —Experience Cloud site channel. ConnectedApp —Channel served by a connected app. PublicUnauthenticated —Public channel. All published content is publicly available. UserPermission —Channel backed by a system permission. All published content is available only to users with the permission.
   */
  global ConnectApi.ManagedContentChannelType type;

}