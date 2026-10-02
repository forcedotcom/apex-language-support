/**
 * Defines the different modes, such as system or user mode, that Apex database operations execute in.
 * <p>Usage
 * By default, Apex code runs in user mode, which means that the current user’s object permissions, field-level security, and sharing rules are enforced. You can set a specific DML method to system mode, where the object and field-level permissions of the current user are ignored, and the record sharing rules are controlled by the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm" target="_blank">class sharing keywords</a>.
 * Many of the DML methods of the System.Database and System.Search classes include an accessLevel parameter to specify the execution mode.
 * <p>Example
 * If the user running this Apex code doesn't have write access to the Account object, the Database.insert() method returns an error.
 * List<Account> toInsert = new List<Account>{new Account(Name = 'Exciting New Account')};
 *
 * List<Database.SaveResult> sr = Database.insert(toInsert, AccessLevel.USER_MODE);
 *
 * In contrast, this example shows the method running in system mode. The success of the insert doesn't depend on whether the user running the Apex code has create access to the Account object.
 * List<Account> toInsert = new List<Account>{new Account(Name = 'Exciting New Account')};
 *
 * List<Database.SaveResult> sr = Database.insert(toInsert, AccessLevel.SYSTEM_MODE);
 */
global with sharing class AccessLevel {
    /**
     * Execution mode in which the the object and field-level permissions of the current user are ignored, and the record sharing rules are controlled by the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm" target="_blank">class sharing keywords</a>.
     * <p>System.AccessLevel
     */
    global final static System.AccessLevel SYSTEM_MODE;
    /**
     * Execution mode in which the object permissions, field-level security, and sharing rules of the current user are enforced.
     * <p>System.AccessLevel
     */
    global final static System.AccessLevel USER_MODE;

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    /**
     * Supports database and search operations to be run with permissions specified in a permission set. Apex enforces field-level security (FLS) and object permissions as per the specified permission set, in addition to the running user’s permissions.
     * <p>Note
     * Feature is available as a developer preview. Feature isn’t generally available unless or until Salesforce announces its general availability in documentation or in press releases or public statements. All commands, parameters, and other features are subject to change or deprecation at any time, with or without notice. Don’t implement functionality developed with these commands or tools in a production environment. You can provide feedback and suggestions for the “Permission Sets with User Mode” feature in the <a class="xref" href="https://trailhead.salesforce.com/trailblazer-community/groups/0F94S000000GvrW" target="_blank" title="HTML (New Window)">Trailblazer Community</a>.
     * This feature is available in scratch orgs where the ApexUserModeWithPermset feature is enabled. If the feature isn’t enabled, Apex code with this feature can be compiled but not executed.
     */
    global System.AccessLevel withPermissionSetId(String permissionSetId) { return null; }
}