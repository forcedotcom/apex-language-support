global with sharing class Dags {
    global Dags() { }

    @AuraEnabled
    global static void deleteDag(String id) { }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static Map getDags(wave.DagsSearchOptions options) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}