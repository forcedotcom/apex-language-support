/**
 * If a feed element has this capability, it renders a canvas app.
 */
global class CanvasCapability {

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
   * The icon for the canvas app.
   */
  global ConnectApi.Icon icon;

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