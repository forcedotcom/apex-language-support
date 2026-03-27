/**
 * Information about a managed content provider instance.
 */
global class ManagedContentProviderInstance {

  /**
   * Provider instance key.
   */
  global String instanceKey;

  /**
   * Specifies whether the instance is the default instance ( true ) or not ( false ).
   */
  global Boolean isDefault;

  /**
   * Specifies whether the provider instance is enabled for the managed content space ( true ) or not ( false ). If there isn't a managed content space context, defaults to false .
   */
  global Boolean isEnabledForSpace;

  /**
   * Name of the provider instance.
   */
  global String name;

  /**
   * ID of the provider instance.
   */
  global String providerInstanceId;

}