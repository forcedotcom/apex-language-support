/**
 * If a feed element has this capability, it has a banner motif and style.
 */
global class BannerCapability extends ConnectApi.FeedElementCapability {

  /**
   * A banner motif.
   */
  global ConnectApi.Motif motif;

  /**
   * Decorates a feed item with a color and set of icons. Possible value: Announcement —An announcement displays in a designated location in the Salesforce UI until 11:59 p.m. on its expiration date, unless it’s deleted or replaced by another announcement.
   */
  global ConnectApi.BannerStyle style;

}