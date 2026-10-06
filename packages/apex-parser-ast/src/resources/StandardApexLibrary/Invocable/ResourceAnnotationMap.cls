@JsonAccess
global class ResourceAnnotationMap {
    @AuraEnabled
    global Boolean collection { get; set; }
    @AuraEnabled
    global String name { get; set; }
    @AuraEnabled
    global String resourceField { get; set; }
    @AuraEnabled
    global String resourceName { get; set; }
    @AuraEnabled
    global String resourceType { get; set; }

    global ResourceAnnotationMap() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}