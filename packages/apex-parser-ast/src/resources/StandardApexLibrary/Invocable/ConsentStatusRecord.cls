global class ConsentStatusRecord {
    @AuraEnabled
    global String assetName { get; set; }
    @AuraEnabled
    global String commSubscriptionChannelTypeId { get; set; }
    @AuraEnabled
    global String commSubscriptionId { get; set; }
    @AuraEnabled
    global String consentLevel { get; set; }
    @AuraEnabled
    global String consentStatus { get; set; }
    @AuraEnabled
    global String contactPointValue { get; set; }
    @AuraEnabled
    global String engagementChannelTypeId { get; set; }
    @AuraEnabled
    global String flowDataSpaceApiName { get; set; }
    @AuraEnabled
    global String flowName { get; set; }
    @AuraEnabled
    global String flowTriggerType { get; set; }
    @AuraEnabled
    global String senderCode { get; set; }

    global Object ConsentStatusRecord() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}