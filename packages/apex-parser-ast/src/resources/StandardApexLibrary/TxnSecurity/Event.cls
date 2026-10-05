/**
 * Contains event information that the evaluate method uses to evaluate a transaction security policy.
 * <p>Usage
 * The Event class contains the information needed to determine if the event triggers a Transaction Security policy. Not all class attributes are used for every type of event.
 * Tip
 * The EventClass interface applies only to Legacy Transaction Security, which is a retired feature as of Summer '20. Use the EventCondition interface instead of the EventClass interface.
 */
global class Event {
    /**
     * Specifies the action being taken on the resource for an Entity event. For example, a Login IP resource for an Entity event could have an action of create. The action attribute is not used by any other event type.
     * <p>String
     */
    global String action;
    /**
     * Contains data used by actions. For example, data for a login event includes the login history ID. Returns a map whose keys are the type of event data, like SourceIp.
     * <p>Map<String, String>
     * The following table lists all the available data types. Not all types appear with all event types. The data type values are always string representations. For example, the isApi value is a string in the map, but is actually a Boolean value. Convert the value from a string to its true type this way: Boolean.valueOf(event.data.get('isApi'));
     * Key Name True Value Type Events Supported
     * ActionName String Values are:
     * Convert
     * Delete
     * Insert
     * Undelete
     * Update
     * Upsert
     * Entity
     * ApiType String (Enum manifested as a String) DataExport, Login
     * Application String AccessResource, DataExport
     * ClientId String (ID of the client) DataExport
     * ConnectedAppId String (ID of the Connected App) AccessResource, DataExport
     * ExecutionTime milliseconds DataExport
     * IsApi Boolean DataExport
     * IsScheduled Boolean DataExport
     * LoginHistoryId String DataExport, Login
     * NumberOfRecords Integer DataExport
     * PolicyId String (ID of the current policy) All events
     * SessionLevel String (Enum manifested as a String. Values include STANDARD and HIGH_ASSURANCE) AccessResource
     * SourceIp String (IPV4 Address) AccessResource
     * UserName String Entity
     */
    global Map data;
    /**
     * The ID of any entity associated with the event. For example, the entityId of a DataExport event for an Account object contains the Account ID.
     * <p>String
     */
    global String entityId;
    /**
     * The name of the object the event acts on.
     * <p>String
     */
    global String entityName;
    /**
     * The ID of the Salesforce org where the event occurred.
     * <p>String
     */
    global String organizationId;
    /**
     * The type of resource for the event. For example, an AccessResource event could have a Connected Application as a resource type. Not all event types have resources.
     * <p>String
     */
    global String resourceType;
    /**
     * The time the event occurred.
     * <p>Datetime
     */
    global Datetime timeStamp;
    /**
     * Identifies the user that caused the event.
     * <p>String
     */
    global String userId;

    global Event(String organizationId, String userId, String entityName, String action, String resourceType, String entityId, Datetime timeStamp, Map data) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}