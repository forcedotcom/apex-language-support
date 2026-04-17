/**
 * Lightning extension information.
 */
global class LightningExtensionInformation extends ConnectApi.AbstractExtensionInformation {

  /**
   * Component to use in compose state.
   */
  global String compositionComponent;

  /**
   * Label for the extension’s header.
   */
  global String headerTextLabel;

  /**
   * Label for hovering over the extension.
   */
  global String hoverTextLabel;

  /**
   * Component to use in render or preview state.
   */
  global String renderComponent;

}