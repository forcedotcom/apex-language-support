/**
 * Input class to create a managed content channel.
 */
global class ManagedContentChannelCreateRepresentation {

  /**
   * Cache control max age value in seconds.
   */
  global Long cacheControlMaxAge;

  /**
   * ID or name of the domain assigned to the public channel.
   */
  global String domain;

  /**
   * Specifies whether the channel has off-core dedicated content delivery enabled ( true ) or not ( false ). Orgs hosted on Hyperforce use off-core dedicated content delivery to deliver content in public channels with high performance and low latency.
   */
  global Boolean isDedicatedContentDelivery;

  /**
   * Specifies whether the domain is locked and can’t be changed ( true ) or not ( false ).
   */
  global Boolean isDomainLocked;

  /**
   * Specifies whether the text contents of the channel are searchable ( true ) or not ( false ).
   */
  global Boolean isSearchable;

  /**
   * Media cache control max age value in seconds.
   */
  global Long mediaCacheControlMaxAge;

  /**
   * Name of the managed content channel.
   */
  global String name;

  /**
   * ID of the target associated with the managed content channel.
   */
  global String targetId;

  /**
   * Type of managed content channel. Values are: CloudToCloud —Cloud-to-Cloud integrated channel. Community —Experience Cloud site channel. ConnectedApp —Channel served by a connected app. PublicUnauthenticated —Public channel. All published content is publicly available. UserPermission —Channel backed by a system permission. All published content is available only to users with the permission.
   */
  global ConnectApi.ManagedContentChannelType type;

}