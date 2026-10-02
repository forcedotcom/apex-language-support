/**
 * The methods and properties in this class are reserved for future use.
 */
global class ToastLink {
    @AuraEnabled
    global String displayText;
    @AuraEnabled
    global String name;
    @AuraEnabled
    global String url;

    global Object ToastLink() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}