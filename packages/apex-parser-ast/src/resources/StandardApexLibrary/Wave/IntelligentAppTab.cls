global with sharing class IntelligentAppTab {
    global IntelligentAppTab() { }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static Map getDashboardsJson(String templateSourceId, String folderId) { return null; }

    @AuraEnabled
    global static Map getFolderJson(String folderId) { return null; }

    @AuraEnabled
    global static List getIntelligentAppFoldersWithAppVariationJson(String templateSourceId, Boolean includeType) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}