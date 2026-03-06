/**
 * An extension's definition.
 */
global class ExtensionDefinition {

  /**
   * Indicates whether users can access the extension when it’s associated with a feed element.
   */
  global Boolean canAccess;

  /**
   * Indicates whether users can create a feed element with the extension in the org.
   */
  global Boolean canCreate;

  /**
   * Date when the extension was created.
   */
  global Datetime createdDate;

  /**
   * Description of the extension.
   */
  global String description;

  /**
   * URL to the icon for the extension.
   */
  global String iconUrl;

  /**
   * ID of the extension.
   */
  global String id;

  /**
   * Collection of extension information.
   */
  global List < ConnectApi.AbstractExtensionInformation > informationCollection;

  /**
   * Indicates whether the extension is enabled in the site.
   */
  global Boolean isEnabledInCommunity;

  /**
   * Indicates whether the extension is enabled in the Lightning publisher.
   */
  global Boolean isEnabledInLightningPublisher;

  /**
   * Name of the extension.
   */
  global String name;

  /**
   * Position in which the extension is displayed in the publisher.
   */
  global Integer position;

}