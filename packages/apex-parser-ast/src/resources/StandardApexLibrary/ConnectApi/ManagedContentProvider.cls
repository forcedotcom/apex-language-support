/**
 * Information about a managed content provider.
 */
global class ManagedContentProvider {

  /**
   * Provider lightning component definition.
   */
  global String componentDefinition;

  /**
   * Icon of the dropdown menu item.
   */
  global String icon;

  /**
   * Label of the dropdown menu item.
   */
  global String label;

  /**
   * ID of the provider.
   */
  global String providerId;

  /**
   * Instances of the provider.
   */
  global List < ConnectApi.ManagedContentProviderInstance > providerInstances;

  /**
   * ID of the dropdown menu item.
   */
  global String providerLightningComponentId;

  /**
   * Type of managed content provider. Values are: DigitalAssetManager
   */
  global ConnectApi.ManagedContentProviderType type;

}