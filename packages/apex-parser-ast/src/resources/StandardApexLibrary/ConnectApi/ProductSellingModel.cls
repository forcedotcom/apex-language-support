/**
 * Product selling model for Commerce subscriptions.
 */
global class ProductSellingModel {

  /**
   * Description of the product selling model displayed on the UI.
   */
  global String description;

  /**
   * Name of the product selling model displayed on the UI.
   */
  global String displayName;

  /**
   * ID of the product selling model.
   */
  global String id;

  /**
   * Name of the product selling model.
   */
  global String name;

  /**
   * Number of pricing term units in the pricing term. Used with pricingTermUnit to define the length of the pricing term. For example, if pricingTermUnit is Months and this property is 1, the subscription is priced monthly. However, if the sellingModelType property is set to OneTime , the pricingTerm property is empty, because the product isn’t sold as a subscription. The only allowed value for this property is 1.
   */
  global Integer pricingTerm;

  /**
   * Unit of time used to define a pricing term. Value is: Months —Product is priced on a monthly basis. Annual —Product is priced on an annual basis. This unit of time is combined with a number (specified by the pricingTerm property) to define the full term of the subscription. For example, if the unit of time is Months and the pricingTerm property is set to 1, the subscription is priced monthly. However, if the sellingModelType property is set to OneTime , the pricingTermUnit property is empty, because the product isn’t sold as a subscription.
   */
  global ConnectApi.PricingTermUnit pricingTermUnit;

  /**
   * Type of product selling model. Values are: Evergreen —A subscription without an end date. An evergreen subscription continues until the shopper affirmatively cancels it. OneTime —A product that isn’t sold as a subscription. TermDefined —A subscription with a defined end date. The subscription continues for a specified time period. When the term ends, the subscription ends.
   */
  global ConnectApi.SellingModelType sellingModelType;

  /**
   * Rules for the subscription term.
   */
  global ConnectApi.SubscriptionTermRule subscriptionTermRule;

}