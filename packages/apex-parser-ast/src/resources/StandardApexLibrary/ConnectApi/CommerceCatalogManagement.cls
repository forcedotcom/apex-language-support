/**
 * Create or update a composite product. Create a variation product.
 */
global class CommerceCatalogManagement {

  global CommerceCatalogManagement() {}

  global static ConnectApi.CompositeCommerceProductOutputRepresentation compositeCommerceProductCreate(String webstoreId, ConnectApi.CompositeCommerceProductInputRepresentation compositeCommerceProductInputRepresentation) {}

  global static ConnectApi.CompositeCommerceProductOutputRepresentation compositeCommerceProductUpdate(String webstoreId, String productId, ConnectApi.CompositeCommerceProductInputRepresentation compositeCommerceProductInputRepresentation) {}

  global static ConnectApi.CompositeCommerceVariationOutputRepresentation compositeCommerceVariationCreate(String webstoreId, ConnectApi.CompositeCommerceVariationInputRepresentation compositeCommerceVariationInputRepresentation) {}

  global Object clone() {}

}