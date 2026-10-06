global with sharing class Lenses {
    global Lenses() { }

    global virtual Boolean equals(Object o) { return false; }

    global static Map getLens(String lensIdOrApiName) { return null; }

    @AuraEnabled
    global static Map getLens(String lensIdOrApiName, String filterGroup) { return null; }

    global static Map getLenses() { return null; }

    @AuraEnabled
    global static Map getLenses(wave.LensesSearchOptions options) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}