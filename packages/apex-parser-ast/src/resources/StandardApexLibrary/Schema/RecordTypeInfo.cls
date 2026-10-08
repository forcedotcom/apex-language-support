/**
 * Contains methods for accessing record type information for an sObject with associated record types.
 * Usage
 * A RecordTypeInfo object is returned from the sObject describe result using the getRecordTypeInfos method. For example:
 * Schema.DescribeSObjectResult R = Account.SObjectType.getDescribe();
 * List<Schema.RecordTypeInfo> RT = R.getRecordTypeInfos();
 * In addition to the getRecordTypeInfos method, you can use the getRecordTypeInfosById and the getRecordTypeInfosByName methods. These methods return maps that associate RecordTypeInfo with record IDs and record labels, respectively.
 * Example
 * The following example assumes at least one record type has been created for the Account object:
 * RecordType rt = [SELECT Id,Name FROM RecordType WHERE SobjectType='Account' WITH USER_MODE LIMIT 1];
 * Schema.DescribeSObjectResult d = Schema.SObjectType.Account;
 * Map<Id,Schema.RecordTypeInfo> rtMapById = d.getRecordTypeInfosById();
 * Schema.RecordTypeInfo rtById =  rtMapById.get(rt.id);
 * Map<String,Schema.RecordTypeInfo> rtMapByName = d.getRecordTypeInfosByName();
 * Schema.RecordTypeInfo rtByName =  rtMapByName.get(rt.name);
 * Assert.areEqual(rtById,rtByName);
 */
global class RecordTypeInfo {
    global Boolean active { get; }
    global Boolean available { get; }
    global Boolean defaultrecordtypemapping { get; }
    global String developername { get; }
    global Boolean master { get; }
    global String name { get; }
    global Id recordtypeid { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the developer name for this record type.
     */
    global String getDeveloperName() { return null; }

    /**
     * Returns the UI label of this record type. The label can be translated into any language that Salesforce supports.
     */
    global String getName() { return null; }

    /**
     * Returns the ID of this record type.
     */
    global Id getRecordTypeId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if this record type is active, false otherwise.
     */
    global Boolean isActive() { return false; }

    /**
     * Returns true if this record type is available to the current user, false otherwise. Use this method to display a list of available record types to the user when he or she is creating a new record.
     */
    global Boolean isAvailable() { return false; }

    /**
     * Returns true if this is the default record type for the user, false otherwise.
     */
    global Boolean isDefaultRecordTypeMapping() { return false; }

    /**
     * Returns true if this is the master record type and false otherwise. The master record type is the default record type that’s used when a record has no custom record type associated with it.
     */
    global Boolean isMaster() { return false; }

    global String toString() { return null; }
}