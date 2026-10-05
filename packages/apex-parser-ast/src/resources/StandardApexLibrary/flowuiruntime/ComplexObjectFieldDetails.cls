/**
 * The methods and properties in this class are for internal use only.
 */
global class ComplexObjectFieldDetails {
    @AuraEnabled
    global String apiName;
    @AuraEnabled
    global String label;
    @AuraEnabled
    global Integer scale;
    @AuraEnabled
    global String type;

    global ComplexObjectFieldDetails() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}