/**
 * The BuyerGroupEvaluationService class allows you define and execute custom business logic for dynamically assigning users to buyer groups. Unlike out-of-the-box configurations limited to account, market, or data segment-based buyer groups, this service supports extensibility and empowers you to implement tailored buyer group evaluation strategies. It supports both guest and logged-in user scenarios, enabling highly customizable and context-specific buyer group determination.
 * <p>Consideration
 * When implementing the BuyerGroupEvaluationService, remember these key points:
 * The number of buyer groups that can be assigned to a user is determined by the limit set in your Salesforce org. See <a class="xref" href="https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-data-model-shopper-buyer-groups-accounts-limits.html" target="_blank" title="HTML (New Window)">Shopper Buyer Groups and Accounts Data Limits Groups</a>.
 * Supported for B2B stores and D2C stores with custom checkout enabled. It isn't available for stores using managed checkout. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=commerce.comm_custom_checkout.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Configure Custom Checkout for a B2B or D2C Store</a>.
 * Buyer group assignments may not take effect immediately if caching is enabled. To make sure the buyer group extensibility service functions properly and to avoid caching-related issues, disable both the Salesforce Content Delivery Network (CDN) and Salesforce Edge Network.
 * Test these changes in your sandbox org before applying them in production. Go to My Domain Settings and disable both options for enhanced domains.
 * See <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.community_builder_cdn_considerations.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Considerations for the Salesforce CDN</a> and <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.domain_name_edge_network_considerations.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Considerations for Salesforce Edge Network</a>.
 * <p>Usage
 * Use the BuyerGroupEvaluationService to implement custom logic for assigning users to buyer groups. By integrating your logic with this service, you can evaluate and assign buyer groups in real time based on criteria specific to your organization.
 * Define Custom Logic—Create your own business rules to evaluate and assign users to appropriate Buyer Groups.
 * Integration with the Service—Integrate your custom logic into the BuyerGroupEvaluationService to dynamically determine buyer group membership at runtime.
 * Test and Validate—Test your implementation to ensure it behaves as expected and doesn’t introduce errors or inconsistencies in group assignments.
 * <p>Example
 * For an example implementation of the CommerceBuyGrp.BuyerGroupEvaluationService class, see <a class="xref" href="https://github.com/forcedotcom/commerce-extensibility/blob/main/commerce/domain/buyergroup/service/classes/BuyerGroupEvaluationServiceSample.cls" target="_blank" title="HTML (New Window)">Commerce Extensibility</a>.
 */
global virtual class BuyerGroupEvaluationService {
    global BuyerGroupEvaluationService() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Retrieves a list of evaluated buyer group IDs assigned to a user based on custom or predefined business logic.
     */
    global virtual CommerceBuyGrp.BuyerGroupResponse getBuyerGroupIds(CommerceBuyGrp.BuyerGroupRequest request) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}