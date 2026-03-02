/**
 * Use this interface to implement asynchronous integrations in B2B Commerce.
 */
public interface AsyncCartProcessor {

  /**
   * The startCartProcessAsync method is called asynchronously by the integration framework. Calling this method begins cart processing for Commerce checkout.
   * @param integrationInfo Provides values that B2B Commerce checkout APIs use to map requests to responses, necessary metadata, and context.
   * @param cartId ID of the WebCart object.
   * @return sfdc_checkout.IntegrationStatus
   */
  sfdc_checkout.IntegrationStatus startCartProcessAsync(sfdc_checkout.IntegrationInfo integrationInfo, Id cartId);

}