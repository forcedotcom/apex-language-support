/**
 * A banner photo.
 */
global class BannerPhoto {

  global BannerPhoto() {}

  /**
   * URL to the banner photo in a large format. This URL is available only to authenticated users.
   */
  global String bannerPhotoUrl;

  /**
   * 18-character version ID of the banner photo.
   */
  global String bannerPhotoVersionId;

  /**
   * URL to the banner photo.
   */
  global String url;

  global Object clone() {}

}