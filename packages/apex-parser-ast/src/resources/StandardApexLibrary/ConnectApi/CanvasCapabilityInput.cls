/**
 * Create or update a canvas app associated with a feed element.
 */
global class CanvasCapabilityInput {

  /**
   * A description of the canvas app. The maximum size is 255 characters.
   */
  global String description;

  /**
   * The API name (developer name) of the client app.
   */
  global String developerName;

  /**
   * The height of the canvas app in pixels.
   */
  global String height;

  /**
   * A unique namespace prefix for the canvas app.
   */
  global String namespacePrefix;

  /**
   * JSON parameters passed to the canvas app.
   */
  global String parameters;

  /**
   * A thumbnail URL to a preview image. The maximum thumbnail size is 120 pixels by 120 pixels.
   */
  global String thumbnailUrl;

  /**
   * A title for the canvas link.
   */
  global String title;

}