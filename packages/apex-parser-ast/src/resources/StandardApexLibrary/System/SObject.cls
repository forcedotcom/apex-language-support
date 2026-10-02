/**
 * Contains methods for the sObject data type.
 * <p>Usage
 * SObject methods are all instance methods: they are called by and operate on an sObject instance such as an account or contact. The following are the instance methods for sObjects.
 * For more information on sObjects, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_SObjects.htm" target="_blank">Working with sObjects</a>.
 */
global class SObject {
    global void addError(Object msg) { }

    /**
     * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
     * <p>Usage
     * When used on Trigger.new in insert and update triggers, and on Trigger.old in delete triggers, the error message is displayed in the application interface.
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_triggers.htm" target="_blank">Triggers</a> and <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_triggers_exceptions.htm" target="_blank">Trigger Exceptions</a>.
     * Note
     * This method escapes any HTML markup in the specified error message. The escaped characters are: \n, <, >, &, ", \, \u2028, \u2029, and \u00a9. As a result, HTML markup is not rendered; instead, it is displayed as text in the Salesforce user interface.
     * When used in Visualforce controllers, the generated message is added to the collection of errors for the page. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.pages.meta/pages/pages_controller_std.htm" target="_blank" title="HTML (New Window)">Validation Rules and Standard Controllers</a> in the Visualforce Developer's Guide.
     * <p>Example
     * Trigger.new[0].addError('bad');
     */
    global void addError(String msg) { }

    /**
     * Dynamically add errors to fields of an SObject associated with the specified field name.
     * <p>Usage
     * If the field name is an empty string or null, the error is associated with the SObject and not with a specific field.
     * <p>Example
     * // Add an error to an SObject field using the addError() method.
     * Account acct = new Account(name = 'TestAccount');
     * acct.addError('name', 'error in name field');
     * // Use the hasErrors() method to verify that the error is added, and then the getErrors() method to validate the error.
     * System.Assert(acct.hasErrors());
     * List<Database.Error> errors = acct.getErrors();
     * System.AssertEquals(1, errors.size());
     */
    global void addError(String fieldName, String msg) { }

    global void addError(Schema.SObjectField fieldToken, String msg) { }

    global void addError(Object msg, Boolean escape) { }

    /**
     * Marks a trigger record with a custom error message, specifies if the error message should be escaped, and prevents any DML operation from occurring.
     * <p>Usage
     * The escaped characters are: \n, <, >, &, ", \, \u2028, \u2029, and \u00a9. As a result, HTML markup is not rendered; instead, it is displayed as text in the Salesforce user interface.
     * Warning
     * Be cautious if you specify false for the escape argument. Unescaped strings displayed in the Salesforce user interface can represent a vulnerability in the system because these strings might contain harmful code. If you want to include HTML markup in the error message, call this method with a false escape argument. Make sure that you escape any dynamic content, such as input field values. Otherwise, specify true for the escape argument or call addError(String errorMsg) instead.
     * <p>Example
     * Trigger.new[0].addError('Fix & resubmit', false);
     */
    global void addError(String msg, Boolean escape) { }

    /**
     * Dynamically add errors to fields of an SObject associated with the specified field name.
     * <p>Usage
     * If the field name is an empty string or null, the error is associated with the SObject and not with a specific field.
     * The escaped characters are: \n, <, >, &, ", \, \u2028, \u2029, and \u00a9. As a result, HTML markup is not rendered; instead, it is displayed as text in the Salesforce user interface.
     * Warning
     * The escape parameter cannot be disabled in Lightning Experience and in the Salesforce mobile app, and will be ignored.
     * Be cautious if you specify false for the escape argument. Unescaped strings displayed in the Salesforce user interface can represent a vulnerability in the system because these strings might contain harmful code. If you want to include HTML markup in the error message, call this method with a false escape argument. Make sure that you escape any dynamic content, such as input field values. Otherwise, specify true for the escape argument or call addError(String fieldName, String errorMsg) instead.
     * <p>Example
     * // Add an error to an SObject field using the addError() method.
     * Account acct = new Account(name = 'TestAccount');
     * acct.addError('name', 'error in name field', false);
     * // Use the hasErrors() method to verify that the error is added, and then the getErrors() method to validate the error.
     * System.Assert(acct.hasErrors());
     * List<Database.Error> errors = acct.getErrors();
     * System.AssertEquals(1, errors.size());
     */
    global void addError(String fieldName, String msg, Boolean escape) { }

    /**
     * Dynamically add errors to an SObject instance associated with the specified field.
     * <p>Usage
     * Use this method to add errors to the specified field token of a standard or custom object. If fieldTokenis null, the error is associated with the SObject and not with a specific field.
     * The escaped characters are: \n, <, >, &, ", \, \u2028, \u2029, and \u00a9. As a result, HTML markup is not rendered; instead, it is displayed as text in the Salesforce user interface.
     * Warning
     * The escape parameter cannot be disabled in Lightning Experience and in the Salesforce mobile app, and will be ignored.
     * Be cautious if you specify false for the escape argument. Unescaped strings displayed in the Salesforce user interface can represent a vulnerability in the system because these strings might contain harmful code. If you want to include HTML markup in the error message, call this method with a false escape argument. Make sure that you escape any dynamic content, such as input field values. Otherwise, specify true for the escape argument or call addError(Schema.SObjectField fieldToken, String errorMsg) instead.
     * <p>Example
     * // Add an error to a field of an SObject instance using the addError() method.
     * Account acct = new Account(name = 'TestAccount');
     * Schema.DescribeFieldResult nameDesc = Account.name.getDescribe();
     * Schema.sObjectField nameField = nameDesc.getSObjectField();
     * acct.addError(nameField, 'error is name field', false);
     * // Use the hasErrors() method to verify that the error is added, and then the getErrors() method to validate the error.
     * System.Assert(acct.hasErrors());
     * List<Database.Error> errors = acct.getErrors();
     * System.AssertEquals(1, errors.size());
     */
    global void addError(Schema.SObjectField fieldToken, String msg, Boolean escape) { }

    /**
     * Clears all field values
     * <p>Example
     * Account acc = new account(Name = 'Acme');
     * acc.clear();
     * Account expected = new Account();
     * system.assertEquals(expected, acc);
     */
    global void clear() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the value for the field specified by fieldName, such as AccountNumber.
     * <p>Usage
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_soql.htm" target="_blank">Dynamic SOQL</a>.
     * <p>Example
     * Account acc = new account(Name = 'Acme', Description = 'Acme Account');
     * String description = (String)acc.get('Description');
     * System.assertEquals('Acme Account', description);
     * <p>Versioned Behavior Changes
     * In API version 34.0 and later, you must include the namespace name to retrieve a field from a field Map using this method. For example, to get the account__c field in the MyNamespace namespace from a fields field Map, use: fields.get(‘MyNamespace__account__c’).
     */
    global Object get(String field) { return null; }

    /**
     * Returns the value for the field specified by the field token Schema.sObjectField, such as, Schema.Account.AccountNumber.
     * <p>Usage
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_soql.htm" target="_blank">Dynamic SOQL</a>.
     * Note
     * Field tokens aren't available for person accounts. If you access Schema.Account.fieldname, you get an exception error. Instead, specify the field name as a string.
     * <p>Example
     * Account acc = new account(Name = 'Acme', Description = 'Acme Account');
     * String description = (String)acc.get(Schema.Account.Description);
     * System.assertEquals('Acme Account', description);
     */
    global Object get(Schema.SObjectField field) { return null; }

    global Map getAll() { return null; }

    /**
     * Returns the ID of the entity from which an object was cloned. You can use it for objects cloned through the Salesforce user interface. You can also use it for objects created using the System.SObject.clone(preserveId, isDeepClone, preserveReadonlyTimestamps, preserveAutonumber) method, provided that the preserveId parameter wasn’t used or was set to false. The getCloneSourceId() method can only be used within the transaction where the entity is cloned, as clone information doesn’t persist in subsequent transactions.
     * <p>Usage
     * If A is cloned to B, B is cloned to C, and C is cloned to D, then B, C, and D all point back to A as their clone source.
     * <p>Example
     * Account acc0 = new Account(Name = 'Acme');
     * insert acc0;
     * Account acc1 = acc0.clone();
     * Account acc2 = acc1.clone();
     * Account acc3 = acc2.clone();
     * Account acc4 = acc3.clone();
     * System.assert(acc0.Id != null);
     * System.assertEquals(acc0.Id, acc1.getCloneSourceId());
     * System.assertEquals(acc0.Id, acc2.getCloneSourceId());
     * System.assertEquals(acc0.Id, acc3.getCloneSourceId());
     * System.assertEquals(acc0.Id, acc4.getCloneSourceId());
     * System.assertEquals(null, acc0.getCloneSourceId());
     */
    global Id getCloneSourceId() { return null; }

    /**
     * Returns a list of Database.Error objects for an SObject instance. If the SObject has no errors, an empty list is returned.
     */
    global List getErrors() { return null; }

    global SObject getInstance() { return null; }

    global SObject getInstance(String id) { return null; }

    /**
     * Returns the database.DMLOptions object for the SObject.
     * <p>Example
     * Database.DMLOptions dmo = new Database.dmlOptions();
     * dmo.assignmentRuleHeader.useDefaultRule = true;
     *
     * Account acc = new Account(Name = 'Acme');
     * acc.setOptions(dmo);
     * Database.DMLOptions accDmo = acc.getOptions();
     */
    global Database.DMLOptions getOptions() { return null; }

    global SObject getOrgDefaults() { return null; }

    /**
     * Returns a map of populated field names and their corresponding values. The map contains only the fields that have been populated in memory for the SObject instance.
     * <p>Usage
     * The returned map contains only the fields that have been populated in memory for the SObject instance, which makes it easy to iterate over those fields. A field is populated in memory in these cases.
     * The field has been queried by a SOQL statement, and the field is not null.
     * The field has been explicitly set before the call to the getPopulatedFieldsAsMap() method.
     * Fields on related objects that are queried or set are also returned in the map.
     * The following example iterates over the map returned by the getPopulatedFieldsAsMap() method after a SOQL query.
     * Account a = new Account();
     * a.name = 'TestMapAccount1';
     * insert a;
     * a = [select Id,Name from Account where id=:a.Id];
     * Map<String, Object> fieldsToValue = a.getPopulatedFieldsAsMap();
     *
     * for (String fieldName : fieldsToValue.keySet()){
     *     System.debug('field name is ' + fieldName + ', value is ' +
     *         fieldsToValue.get(fieldName));
     * }
     *
     * // Example debug statement output:
     * // DEBUG|field name is Id, value is 001R0000003EPPkIAO
     * // DEBUG|field name is Name, value is TestMapAccount1
     *
     * This example iterates over the map returned by the getPopulatedFieldsAsMap() method after fields on the SObject are explicitly set.
     * Account a = new Account();
     * a.name = 'TestMapAccount2';
     * a.phone = '123-4567';
     * insert a;
     * Map<String, Object> fieldsToValue = a.getPopulatedFieldsAsMap();
     *
     * for (String fieldName : fieldsToValue.keySet()) {
     *     System.debug('field name is ' + fieldName + ', value is ' +
     *         fieldsToValue.get(fieldName));
     * }
     *
     * // Example debug statement output:
     * // DEBUG|field name is Name, value is TestMapAccount2
     * // DEBUG|field name is Phone, value is 123-4567
     * // DEBUG|field name is Id, value is 001R0000003EPPpIAO
     * The following example shows how to use the getPopulatedFieldsAsMap() method with related objects.
     * Account a = new Account();
     * a.name='TestMapAccount3';
     * insert a;
     * Contact c = new Contact();
     * c.firstname='TestContactFirstName';
     * c.lastName ='TestContactLastName';
     * c.accountid = a.id;
     * insert c;
     *
     * c = [SELECT id, Contact.Firstname, Contact.Account.Name FROM Contact
     *         where id=:c.id limit 1];
     * Map<String, Object> fieldsToValue = c.getPopulatedFieldsAsMap();
     *
     * // To get the fields on Account, get the Account object
     * // and call getMapPopulatedFieldsAsMap() on that object.
     *
     * a = (Account)fieldsToValue.get('Account');
     * fieldsToValue = a.getPopulatedFieldsAsMap();
     *
     * for (String fieldName : fieldsToValue.keySet()) {
     *     System.debug('field name is ' + fieldName + ', value is ' +
     *         fieldsToValue.get(fieldName));
     * }
     *
     * // Example debug statement output:
     * // DEBUG|field name is Id, value is 001R0000003EPPuIAO
     * // DEBUG|field name is Name, value is TestMapAccount3
     * <p>Versioned Behavior Changes
     * In API version 39.0 and later, getPopulatedFieldsAsMap returns all values set on the SObject, even if values were set after the record was queried. This behavior is dependent on the version of the apex class calling this method and not on the version of the class that generated the SObject. If you query an SObject at API version 20.0, and then call this method in a class with API version 40.0, you will get the full set of fields.
     * @return A map of field names and their corresponding values.
     */
    global Map getPopulatedFieldsAsMap() { return null; }

    /**
     * Retrieves the name of a quick action associated with this SObject. Typically used in triggers.
     * <p>Example
     * trigger accTrig2 on Contact (before insert) {
     *     for (Contact c : Trigger.new) {
     *         if (c.getQuickActionName() == QuickAction.CreateContact) {
     *             c.WhereFrom__c = 'GlobaActionl';
     *         } else if (c.getQuickActionName() == Schema.Account.QuickAction.CreateContact) {
     *             c.WhereFrom__c = 'AccountAction';
     *         } else if (c.getQuickActionName() == null) {
     *             c.WhereFrom__c = 'NoAction';
     *         } else {
     *             System.assert(false);
     *         }
     *     }
     * }
     */
    global String getQuickActionName() { return null; }

    /**
     * Returns the value for the specified field. This method is primarily used with dynamic DML to access values for external IDs.
     * <p>Example
     * Account acc = new account(Name = 'Acme', Description = 'Acme Account');
     * insert acc;
     * Contact con = new Contact(Lastname = 'AcmeCon', AccountId = acc.id);
     * insert con;
     *
     * SObject contactDB =
     *     [SELECT Id, AccountId, Account.Name FROM Contact WHERE id = :con.id LIMIT 1];
     * Account a = (Account)contactDB.getSObject('Account');
     * System.assertEquals('Acme', a.name);
     */
    global SObject getSObject(String field) { return null; }

    /**
     * Returns the value for the field specified by the field token Schema.sObjectField, such as, Schema.MyObj.MyExternalId. This method is primarily used with dynamic DML to access values for external IDs.
     * <p>Usage
     * If the method references polymorphic fields, a <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.object_reference.meta/object_reference/sforce_api_objects_name.htm" target="_blank">Name object</a> is returned. Use the TYPEOF clause in the SOQL SELECT statement to directly get results that depend on the runtime object type referenced by the polymorphic field. See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_SOQL_polymorphic_relationships.htm" target="_blank">Working with Polymorphic Relationships in SOQL Queries</a>.
     * <p>Example
     * Account acc = new account(name = 'Acme', description = 'Acme Account');
     * insert acc;
     * Contact con = new contact(lastname = 'AcmeCon', accountid = acc.id);
     * insert con;
     *
     * Schema.DescribeFieldResult fieldResult = Contact.AccountId.getDescribe();
     * Schema.SObjectField field = fieldResult.getSObjectField();
     *
     * SObject contactDB =
     *     [SELECT Id, AccountId, Account.Name FROM Contact WHERE id = :con.id LIMIT 1];
     * Account a = (Account)contactDB.getSObject(field);
     * System.assertEquals('Acme', a.name);
     */
    global SObject getSObject(Schema.SObjectField field) { return null; }

    /**
     * Returns the token for this SObject. This method is primarily used with describe information.
     * <p>Usage
     * For more information, see apex_dynamic_describe_objects_understanding.
     * <p>Example
     * Account acc = new Account(name = 'Acme', description = 'Acme Account');
     * Schema.SObjectType expected = Schema.Account.getSObjectType();
     * System.assertEquals(expected, acc.getSObjectType());
     */
    global Schema.SObjectType getSObjectType() { return null; }

    /**
     * Returns the values for the specified field. This method is primarily used with dynamic DML to access values for associated objects, such as child relationships.
     * <p>Usage
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_dml.htm" target="_blank">Dynamic DML</a>.
     * <p>Example
     * Account acc = new account(name = 'Acme', description = 'Acme Account');
     * insert acc;
     * Contact con = new contact(lastname = 'AcmeCon', accountid = acc.id);
     * insert con;
     *
     * SObject[] a = [SELECT id, (SELECT Name FROM Contacts LIMIT 1) FROM Account WHERE id = :acc.id];
     * SObject[] contactsDB = a.get(0).getSObjects('Contacts');
     * String fieldValue = (String)contactsDB.get(0).get('Name');
     * System.assertEquals('AcmeCon', fieldValue);
     */
    global List getSObjects(String field) { return null; }

    global List getSObjects(Schema.SObjectField field) { return null; }

    global SObject getValues(String id) { return null; }

    /**
     * Returns true if an SObject instance has associated errors. The error message can be associated to the SObject instance by using SObject.addError(), validation rules, or by other means.
     */
    global Boolean hasErrors() { return false; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if an entity is cloned from something, even if the entity hasn’t been saved. The method can only be used within the transaction where the entity is cloned, as clone information doesn’t persist in subsequent transactions.
     * <p>Example
     * Account acc = new Account(Name = 'Acme');
     * insert acc;
     * Account acc2 = acc.clone();
     * // Test before saving
     * System.assertEquals(true, acc2.isClone());
     * insert acc2;
     * // Test after saving
     * System.assertEquals(true, acc2.isClone());
     */
    global Boolean isClone() { return false; }

    /**
     * Returns information about the queried sObject field. Returns true if the sObject field is populated, either by direct assignment or by inclusion in a SOQL query. Returns false if the sObject field isn’t set. If an invalid field is specified, an SObjectException is thrown.
     * <p>Usage
     * The isSet method doesn’t check if a field is accessible to a specific user via org permissions or other specialized access permissions.
     * <p>Example
     * Contact  newContact = new Contact(LastName = 'Joyce');
     * insert(newContact); //Insert a new contact with last name Joyce
     * Contact c = [SELECT FirstName FROM Contact WHERE Id = :newContact.Id];
     * System.assertEquals(true, c.isSet(Contact.FirstName)); //FirstName field in query
     * System.assertEquals(false, c.isSet(Contact.LastName)); //LastName field not in query
     */
    global Boolean isSet(Schema.SObjectField field) { return false; }

    /**
     * Returns information about the queried sObject field. Returns true if the sObject field is populated, either by direct assignment or by inclusion in a SOQL query. Returns false if the sObject field isn’t set. If an invalid field is specified, an SObjectException is thrown.
     * <p>Usage
     * The isSet method doesn’t check if a field is accessible to a specific user via org permissions or other specialized access permissions.
     * <p>Example
     * Contact  c = new Contact(LastName = 'Joyce');
     * System.assertEquals(true, c.isSet('LastName'));
     * System.assertEquals(false, c.isSet('FirstName')); // FirstName field is not written to
     * c.firstName = null;
     * System.assertEquals(true, c.isSet('FirstName')); //FirstName field is written to
     */
    global Boolean isSet(String fieldName) { return false; }

    /**
     * Sets the value for the specified field and returns the previous value for the field.
     * <p>Example
     * Account acc = new Account(name = 'test', description = 'old desc');
     * String oldDesc = (String)acc.put('description', 'new desc');
     * System.assertEquals('old desc', oldDesc);
     * System.assertEquals('new desc', acc.description);
     */
    global Object put(String field, Object value) { return null; }

    /**
     * Sets the value for the field specified by the field token Schema.sObjectField, such as, Schema.Account.AccountNumber and returns the previous value for the field.
     * <p>Example
     * Account acc = new Account(name = 'test', description = 'old desc');
     * String oldDesc = (String)acc.put(Schema.Account.Description, 'new desc');
     * System.assertEquals('old desc', oldDesc);
     * System.assertEquals('new desc', acc.description);
     * Note
     * Field tokens aren't available for person accounts. If you access Schema.Account.fieldname, you get an exception error. Instead, specify the field name as a string.
     */
    global Object put(Schema.SObjectField field, Object value) { return null; }

    /**
     * Sets the value for the specified field. This method is primarily used with dynamic DML for setting external IDs. The method returns the previous value of the field.
     * <p>Example
     * Account acc = new Account(name = 'Acme', description = 'Acme Account');
     * insert acc;
     * Contact con = new contact(lastname = 'AcmeCon', accountid = acc.id);
     * insert con;
     * Account acc2 = new account(name = 'Not Acme');
     *
     * Contact contactDB =
     *     (Contact)[SELECT Id, AccountId, Account.Name FROM Contact WHERE id = :con.id LIMIT 1];
     * Account a = (Account)contactDB.putSObject('Account', acc2);
     * System.assertEquals('Acme', a.name);
     * System.assertEquals('Not Acme', contactDB.Account.name);
     */
    global SObject putSObject(String field, SObject value) { return null; }

    global SObject putSObject(Schema.SObjectField field, SObject value) { return null; }

    /**
     * Deprecated as of API version 57.0. Use the recalculateFormulas() method in the System.Formula class instead.
     * <p>Usage
     * This method doesn’t recalculate cross-object formulas. If you call this method on objects that have both cross-object and non-cross-object formula fields, only the non-cross-object formula fields are recalculated.
     * Each recalculateFormulas call counts against the SOQL query limits. See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_gov_limits.htm" target="_blank">Execution Governors and Limits</a>.
     */
    global void recalculateFormulas() { }

    global void setOptions(Object options) { }

    global String toString() { return null; }
}