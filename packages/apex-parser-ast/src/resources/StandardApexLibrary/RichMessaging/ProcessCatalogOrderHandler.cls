global interface ProcessCatalogOrderHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract RichMessaging.ProcessCatalogOrderResult processCatalogOrderRequest(RichMessaging.ProcessCatalogOrderRequest catalogOrderRequest);

    virtual String toString();
}