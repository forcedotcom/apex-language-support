/**
 * Managed content channel.
 */
global class ManagedContentChannel {

  /**
   * HTTP cache control max age response header for content delivered from the channel.
   */
  global Long cacheControlMaxAge;

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
   * ID or name of the domain assigned to the channel.
   */
  global String domain;

  /**
   * ID of the domain assigned to the channel. In version 52.0 and later, this information is returned in the domain property.
   */
  global String domainId;

  /**
   * Name of the domain assigned to the channel.
   */
  global String domainName;

  /**
   * ID of the managed content channel.
   */
  global String id;

  /**
   * Specifies whether the text contents of the channel are searchable ( true ) or not ( false ).
   */
  global Boolean isChannelSearchable;

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
   * Domain associated with the channel.
   */
  global ConnectApi.ManagedContentChannelDomainRepresentation managedContentChannelDomain;

  /**
   * HTTP cache control max age response header for media delivered from the channel.
   */
  global Long mediaCacheControlMaxAge;

  /**
   * Name of the managed content channel.
   */
  global String name;

  /**
   * ID of the target associated with the channel.
   */
  global String targetId;

  /**
   * Type of managed content channel. Values are: CloudToCloud —Cloud-to-Cloud integrated channel. Community —Experience Cloud site channel. ConnectedApp —Channel served by a connected app. PublicUnauthenticated —Public channel. All published content is publicly available. UserPermission —Channel backed by a system permission. All published content is available only to users with the permission.
   */
  global ConnectApi.ManagedContentChannelType type;

}