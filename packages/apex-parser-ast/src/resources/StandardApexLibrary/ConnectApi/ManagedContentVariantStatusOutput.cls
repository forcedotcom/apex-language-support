/**
 * Information about a managed content variant's status in the authoring space.
 */
global class ManagedContentVariantStatusOutput {

  /**
   * Localized label for the status.
   */
  global String label;

  /**
   * Status of the managed content variant. Values are: Draft —Content isn’t published. Published —Content is published and available for use in your live sites. Revised —Content that’s published and edited. Publish this content to make the changes available for use in your live sites.
   */
  global ConnectApi.ManagedContentVariantStatus status;

}