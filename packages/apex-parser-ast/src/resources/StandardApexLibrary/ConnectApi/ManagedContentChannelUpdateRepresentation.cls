/**
 * Input class to update a managed content channel.
 */
global class ManagedContentChannelUpdateRepresentation {

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

}