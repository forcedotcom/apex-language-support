global class ProcessCatalogOrderRequest {
    @InvocableVariable
    global String catalogId;
    @InvocableVariable
    global List catalogOrderLineItems;
    @InvocableVariable
    global String channelAddressIdentifier;
    @InvocableVariable
    global String idempotenceKey;
    @InvocableVariable
    global String messagingEndUserPlatformKey;

    global Object ProcessCatalogOrderRequest() { return null; }

    global Object ProcessCatalogOrderRequest(String channelAddressIdentifier, String messagingEndUserPlatformKey, String catalogId, List catalogOrderLineItems, String idempotenceKey) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}