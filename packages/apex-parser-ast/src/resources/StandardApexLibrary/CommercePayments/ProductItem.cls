global class ProductItem {
    @AuraEnabled
    global String priceBookId { get; set; }
    @AuraEnabled
    global String productDescription { get; set; }
    @AuraEnabled
    global String productId { get; set; }
    @AuraEnabled
    global String productName { get; set; }
    @AuraEnabled
    global String productSellingModelId { get; set; }
    @AuraEnabled
    global String quantity { get; set; }
    @AuraEnabled
    global String stockKeepingUnit { get; set; }
    @AuraEnabled
    global Integer subscriptionTerm { get; set; }

    global ProductItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}