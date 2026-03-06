/**
 * Create or update a managed content provider instance.
 */
global class ManagedContentProviderInstanceInput {

  /**
   * Provider instance key.
   */
  global String instanceKey;

  /**
   * Specifies whether the instance is the default instance ( true ) or not ( false ).
   */
  global Boolean isDefault;

  /**
   * Name of the provider instance.
   */
  global String name;

  /**
   * ID of the provider lightning component.
   */
  global String providerLightningComponentId;

}