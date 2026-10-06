/**
 * Contains header fields of Change Data Capture events.
 */
global class ChangeEventHeader {
    /**
     * A list of the fields that were changed in an update operation, including the LastModifiedDate system field. This field is empty for other operations, including record creation. This property is available in Apex saved using API version 47.0 or later.
     * List<String>
     */
    global List changedfields { get; set; }
    /**
     * Only populated for changes done by API apps or from Lightning Experience; empty otherwise. The Salesforce API and the API client ID that initiated the change, if set by the client. Use this field to detect whether your app initiated the change to not process the change again and potentially avoid a deep cycle of changes.
     * String
     * The format of the changeOrigin field value is:
     * com/salesforce/api/<API_Name>/<API_Version>;client=<Client_ID>
     * <API_Name> is the name of the Salesforce API used to make the data change. It can take one of these values: soap, rest, bulkapi, xmlrpc, oldsoap, toolingsoap, toolingrest, apex, apexdebuggerrest.
     * <API_Version> is the version of the API call that made the change and is in the format XX.X.
     * <Client_ID> is a string that contains the client ID of the app that initiated the change. If the client ID is not set in the API call, client=<Client_ID> is not appended to the changeOrigin field.
     * Example:
     * com/salesforce/api/soap/49.0;client=Astro
     * The client ID is set in the Call Options header of an API call. For an example on how to set the Call Options header, see:
     * REST API: <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_rest.meta/api_rest/headers_calloptions.htm" target="_blank" title="HTML (New Window)">Sforce-Call-Options Header</a>. (Bulk API also uses the Sforce-Call-Options header. )
     * SOAP API: <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api.meta/api/sforce_api_header_calloptions.htm" target="_blank" title="HTML (New Window)">CallOptions Header</a>. (Apex API also uses the CallOptions element.)
     */
    global String changeorigin { get; set; }
    /**
     * The operation that caused the change.
     * String
     * Can be one of the following values:
     * CREATE
     * UPDATE
     * DELETE
     * UNDELETE
     * SNAPSHOT (reserved for future use)
     * For gap events, the change type starts with the GAP_ prefix.
     * GAP_CREATE
     * GAP_UPDATE
     * GAP_DELETE
     * GAP_UNDELETE
     * For overflow events, the change type is GAP_OVERFLOW.
     */
    global String changetype { get; set; }
    /**
     * The system change number (SCN) of a committed transaction, which increases sequentially. This field is provided for diagnostic purposes. The field value is not guaranteed to be unique in Salesforce—it is unique only in a single database instance. If your Salesforce org migrates to another database instance, the commit number might not be unique or sequential.
     * Long
     */
    global Long commitnumber { get; set; }
    /**
     * The date and time when the change occurred, represented as the number of milliseconds since January 1, 1970 00:00:00 GMT.
     * Long
     */
    global Long committimestamp { get; set; }
    /**
     * The ID of the user that ran the change operation.
     * String
     */
    global String commituser { get; set; }
    /**
     * Contains the names of fields whose values are sent as a unified diff because they contain large text values.
     * List<String>
     */
    global List difffields { get; set; }
    /**
     * The API name of the standard or custom object that the change pertains to. For example, Account or MyObject__c.
     * String
     */
    global String entityname { get; set; }
    /**
     * Contains the names of fields whose values were changed to null in an update operation. Use this field in Apex change event messages to determine if a field was changed to null in an update and isn’t an unchanged field.
     * List<String>
     */
    global List nulledfields { get; set; }
    /**
     * One or more record IDs for the changed records. Typically, this field contains one record ID. If in one transaction the same change occurred in multiple records of the same object type during one second, Salesforce merges the change notifications. In this case, Salesforce sends one change event for all affected records and the recordIds field contains the IDs for all records that have the same change.
     * List<String>
     * Examples of operations with same changes are:
     * Update of fieldA to valueA in Account records.
     * Deletion of Account records.
     * Renaming or replacing a picklist value that results in updating the field value in all affected records.
     * The recordIds field can contain a wildcard value when a change event message is generated for custom field type conversions that cause data loss. In this case, the recordIds value is the three-character prefix of the object, followed by the wildcard character *. For example, for accounts, the value is 001*.
     */
    global List recordids { get; set; }
    /**
     * The sequence of the change within a transaction. The sequence number starts from 1.
     * Integer
     * A lead conversion is an example of a transaction that can have multiple changes. A lead conversion results in the following sequence of changes, all within the same transaction.
     * Create an account
     * Create a contact
     * Create an opportunity
     * Update a lead
     */
    global Integer sequencenumber { get; set; }
    /**
     * A string that uniquely identifies each Salesforce transaction. You can use this key to identify and group all changes that were made in the same transaction.
     * String
     */
    global String transactionkey { get; set; }

    global ChangeEventHeader() { }

    global Boolean equals(Object obj) { return false; }

    global String getChangeOrigin() { return null; }

    global String getChangeType() { return null; }

    global List getChangedFields() { return null; }

    global Long getCommitNumber() { return 0L; }

    global Long getCommitTimestamp() { return 0L; }

    global String getCommitUser() { return null; }

    global List getDiffFields() { return null; }

    global String getEntityName() { return null; }

    global List getNulledFields() { return null; }

    global List getRecordIds() { return null; }

    global Integer getSequenceNumber() { return 0; }

    global String getTransactionKey() { return null; }

    global Integer hashCode() { return 0; }

    global void setChangeOrigin(String param1) { }

    global void setChangeType(String param1) { }

    global void setChangedFields(List param1) { }

    global void setCommitNumber(Long param1) { }

    global void setCommitTimestamp(Long param1) { }

    global void setCommitUser(String param1) { }

    global void setDiffFields(List param1) { }

    global void setEntityName(String param1) { }

    global void setNulledFields(List param1) { }

    global void setRecordIds(List param1) { }

    global void setSequenceNumber(Integer param1) { }

    global void setTransactionKey(String param1) { }

    global String toString() { return null; }
}