/**
 * Specify how to crop a photo that has already been uploaded.
 */
global class PhotoInput {

  /**
   * The length, in pixels, of any edge of the crop square.
   */
  global Integer cropSize;

  /**
   * The position X, in pixels, from the left edge of the image to the start of the crop square. Top left is position (0,0).
   */
  global Integer cropX;

  /**
   * The position Y, in pixels, from the top edge of the image to the start of the crop square. Top left is position (0,0).
   */
  global Integer cropY;

  /**
   * 18 character ID of an existing file. The key prefix must be 069 and the file must be an image and be smaller than 2 GB. Note Images uploaded on the Group page and on the User page don’t have file IDs and therefore can’t be used.
   */
  global String fileId;

  /**
   * Version number of the existing content. If not provided, the latest version is used.
   */
  global Integer versionNumber;

}