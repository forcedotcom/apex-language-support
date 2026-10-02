global class CatalogOrderLineItem {
    @InvocableVariable
    global String productId;
    @InvocableVariable
    global Integer quantity;
    @InvocableVariable
    global RichMessaging.CurrencyAmount unitPrice;

    global Object CatalogOrderLineItem() { return null; }

    global Object CatalogOrderLineItem(String productId, RichMessaging.CurrencyAmount unitPrice, Integer quantity) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}