@JsonAccess
global class ResourceDescriptor {
    @AuraEnabled
    global String resolvedOutput { get; set; }
    @AuraEnabled
    global List resourceAnnotationMap { get; set; }
    @AuraEnabled
    global String resourceTemplate { get; set; }

    global ResourceDescriptor() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}