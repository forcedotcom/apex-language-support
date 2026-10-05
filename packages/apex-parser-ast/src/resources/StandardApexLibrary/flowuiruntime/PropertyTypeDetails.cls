/**
 * The methods and properties in this class are for internal use only.
 */
global class PropertyTypeDetails {
    @AuraEnabled
    global String apexClass;
    @AuraEnabled
    global String objectType;
    @AuraEnabled
    global String propertyName;

    global PropertyTypeDetails() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}