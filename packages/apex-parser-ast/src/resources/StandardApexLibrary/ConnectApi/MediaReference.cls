/**
 * A media reference.
 */
global class MediaReference {

  global MediaReference() {}

  /**
   * URL to stream or download the media.
   */
  global String mediaUrl;

  /**
   * If one exists, URL of the media’s thumbnail.
   */
  global String thumbnailUrl;

  global Object clone() {}

}