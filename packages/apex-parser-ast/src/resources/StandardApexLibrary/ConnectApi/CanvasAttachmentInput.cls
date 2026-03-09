/**
 * Used to attach a canvas app to a feed item.
 */
global class CanvasAttachmentInput extends Connectapi.FeedItemAttachmentInput {

  /**
   * Optional. The description of the canvas app.
   */
  global String description;

  /**
   * The developer name (API name) of the canvas app
   */
  global String developerName;

  /**
   * Optional. The height of the canvas app in pixels. Default height is 200 pixels.
   */
  global String height;

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
   * The title of the link used to call the canvas app.
   */
  global String title;

}