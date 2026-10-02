/**
 * A Schema.sObjectType object is returned from the field describe result using the getReferenceTo method, or from the sObject describe result using the getSObjectType method.
 * <p>Usage
 * Schema.DescribeFieldResult F = Account.Industry.getDescribe();
 * List<Schema.sObjectType> P = F.getReferenceTo();
 */
global class SObjectType {
    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the describe sObject result for this field.
     */
    global Schema.DescribeSObjectResult getDescribe() { return null; }

    /**
     * Returns the describe sObject result for this field; the parameter value determines whether all child relationships are loaded up-front, or not.
     */
    global Schema.DescribeSObjectResult getDescribe(Object options) { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Constructs a new sObject of this type.
     * <p>Example
     * For an example, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_dml.htm" target="_blank">Dynamic DML</a>.
     */
    global SObject newSObject() { return null; }

    /**
     * Constructs a new sObject of this type, with the specified ID.
     * <p>Usage
     * For the argument, pass the ID of an existing record in the database.
     * After you create a new sObject, the sObject returned has all fields set to null. You can set any updateable field to desired values and then update the record in the database. Only the fields you set new values for are updated and all other fields which are not system fields are preserved.
     */
    global SObject newSObject(Id id) { return null; }

    /**
     * Constructs a new sObject of this type, and optionally, of the specified record type ID and with default custom field values.
     * <p>Important
     * Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.
     * <p>Usage
     * For required fields that have no default values, make sure to provide a value before inserting the new sObject. Otherwise, the insertion results in an error. An example is the Account Name field or a master-detail relationship field.
     * Since picklists and multi-select picklists can have default values specified per record type, this method populates the default value corresponding to the record type specified.
     * If fields have no predefined default values and the loadDefaults argument is true, this method creates the sObject with field values of null.
     * If the loadDefaults argument is false, this method creates the sObject with field values of null.
     * This method populates read-only custom fields of the new sObject with default values. You can then insert the new sObject with the read-only fields, even though these fields cannot be edited after they’re inserted.
     * If a custom field is marked as unique and also provides a default value, inserting more than one new sObject will cause a run-time exception because of duplicate field values.
     * To learn more about default field values, see “Default Field Values” in the Salesforce online help.
     * Note
     * You can also use this method to create a platform event with a prepopulated EventUuid field value for Apex publish callbacks. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_events.meta/platform_events/platform_events_publish_callbacks.htm" target="_blank">Get the Result of Asynchronous Platform Event Publishing with Apex Publish Callbacks</a> in the Platform Events Developer Guide.
     * <p>Example: Creating New sObject with Default Values
     * This sample creates an account with any default values populated for its custom fields, if any, using the newSObject method. It also creates a second account for a specific record type. For both accounts, the sample sets the Name field, which is a required field that doesn’t have a default value, before inserting the new accounts.
     * // Create an account with predefined default values
     * Account acct = (Account)Account.sObjectType.newSObject(null, true);
     * // Provide a value for Name
     * acct.Name = 'Acme';
     * // Insert new account
     * insert acct;
     *
     * // This is for record type RT1 of Account
     * ID rtId = [SELECT Id FROM RecordType WHERE sObjectType='Account' AND Name='RT1'].Id;
     * Account acct2 = (Account)Account.sObjectType.newSObject(rtId, true);
     * // Provide a value for Name
     * acct2.Name = 'Acme2';
     * // Insert new account
     * insert acct2;
     */
    global SObject newSObject(Id recordTypeId, Boolean loadDefaultValues) { return null; }

    global String toString() { return null; }
}