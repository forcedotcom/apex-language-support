/**
 * Extension information.
 */
global class AbstractExtensionInformation {

  global AbstractExtensionInformation() {}

  /**
   * Information type of the extension. Values are: Lightning
   */
  global ConnectApi.ExtensionInformationType extensionInformationType;

  global Object clone() {}

}