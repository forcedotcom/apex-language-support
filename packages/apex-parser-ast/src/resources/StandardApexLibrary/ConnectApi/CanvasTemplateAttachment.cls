/**
 * Attachments in feed items with type CanvasPost .
 */
global class CanvasTemplateAttachment {

  /**
   * Optional. Description of the canvas app. The maximum length of this field is 500 characters.
   */
  global String description;

  /**
   * Specifies the developer name (API name) of the canvas app.
   */
  global String developerName;

  /**
   * Optional. The height of the canvas app in pixels. Default height is 200 pixels.
   */
  global String height;

  /**
   * The canvas app icon.
   */
  global ConnectApi.Icon icon;

  /**
   * Optional. The namespace prefix of the Developer Edition organization in which the canvas app was created.
   */
  global String namespacePrefix;

  /**
   * Optional. Parameters passed to the canvas app in JSON format. Example: {'isUpdated'='true'}
   */
  global String parameters;

  /**
   * Optional. A URL to a thumbnail image for the canvas app. Maximum dimensions are 120x120 pixels.
   */
  global String thumbnailUrl;

  /**
   * Specifies the title of the link used to call the canvas app.
   */
  global String title;

}