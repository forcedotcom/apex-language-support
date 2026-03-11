/**
 * A banner photo.
 */
global class BannerPhotoInput {

  /**
   * Height of the crop rectangle in pixels.
   */
  global Integer cropHeight;

  /**
   * Width of the crop rectangle in pixels.
   */
  global Integer cropWidth;

  /**
   * X position of the crop rectangle from the left edge of the image in pixels. Top left is position (0,0).
   */
  global Integer cropX;

  /**
   * Y position of the crop rectangle from the top edge of the image in pixels. Top left is position (0,0).
   */
  global Integer cropY;

  /**
   * 18 character ID of an existing file. The key prefix must be 069 and the file must be an image and be smaller than 2 GB. Note Images uploaded on the Group page and on the User page don’t have file IDs and therefore can’t be used.
   */
  global String fileId;

  /**
   * Version number of an existing file. If not provided, the latest version is used.
   */
  global Integer versionNumber;

}