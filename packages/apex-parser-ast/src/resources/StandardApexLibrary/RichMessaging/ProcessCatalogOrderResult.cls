global class ProcessCatalogOrderResult {
    @InvocableVariable
    global String catalogOrderReferenceId;
    @InvocableVariable
    global String errorMessage;
    @InvocableVariable
    global RichMessaging.ProcessCatalogOrderResultStatus resultStatus;

    global Object ProcessCatalogOrderResult(RichMessaging.ProcessCatalogOrderResultStatus resultStatus) { return null; }

    global Object ProcessCatalogOrderResult(RichMessaging.ProcessCatalogOrderResultStatus resultStatus, String errorMessage) { return null; }

    global Object ProcessCatalogOrderResult(RichMessaging.ProcessCatalogOrderResultStatus resultStatus, String errorMessage, String catalogOrderReferenceId) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}