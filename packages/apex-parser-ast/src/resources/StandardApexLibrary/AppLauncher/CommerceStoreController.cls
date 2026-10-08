global class CommerceStoreController {
    global CommerceStoreController() { }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static Map getCommerceContext() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}