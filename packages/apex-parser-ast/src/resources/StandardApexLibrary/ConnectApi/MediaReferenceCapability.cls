/**
 * If a feed element has this capability, it has one or more media references.
 */
global class MediaReferenceCapability extends ConnectApi.FeedElementCapability {

  /**
   * Collection of media references.
   */
  global List < ConnectApi.MediaReference > media;

}