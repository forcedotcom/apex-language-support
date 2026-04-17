/**
 * Information about a Chatter Answers zone.
 */
global class Zone {

  /**
   * The description of the zone.
   */
  global String description;

  /**
   * The zone ID.
   */
  global String id;

  /**
   * Indicates whether or not the zone is active.
   */
  global Boolean isActive;

  /**
   * Indicates whether or not the zone is available for Chatter Answers.
   */
  global Boolean isChatterAnswers;

  /**
   * Name of the zone.
   */
  global String name;

  /**
   * The URL of the zone.
   */
  global String url;

  /**
   * Zone visibility type. Community —Available in an Experience Cloud site. Internal —Available internally only. Portal —Available in a portal.
   */
  global ConnectApi.ZoneShowIn visibility;

  /**
   * If the zone is available in a site, this property contains the ID of the site. If the zone is available to all sites, this property contains the value All .
   */
  global String visibilityId;

}