/**
 * Contains methods related to Apex tests.
 */
global class Test {
    global Test() { }

    /**
     * Calculates aggregate permissions in a specified permission set group for testing.
     */
    global static void calculatePermissionSetGroup(String psgId) { }

    /**
     * Calculates aggregate permissions in specified permission set groups for testing.
     */
    global static void calculatePermissionSetGroup(List psgIds) { }

    /**
     * Clear the messages on a Visualforce page while executing Apex test methods.
     * Usage
     * This method may only be used in tests.
     */
    global static void clearApexPageMessages() { }

    /**
     * Creates a stub that will respond to SOQL queries against the specified SObject type you can use during testing.
     */
    global static void createSoqlStub(Schema.SObjectType targetType, System.SoqlStubProvider soqlStub) { }

    /**
     * Creates a stubbed version of an Apex class that you can use for testing. This method is part of the Apex stub API. You can use it with the System.StubProvider interface to create a mocking framework.
     * Usage
     * The createStub() method works together with the System.StubProvider interface. You define the behavior of the stubbed object by implementing the StubProvider interface. Then you create a stubbed object using the createStub() method. When you invoke methods on the stubbed object, the handleMethodCall() method of the StubProvider interface is called to perform the behavior of the stubbed method.
     * @return Returns the stubbed object to use in testing.
     */
    global static Object createStub(System.Type parentType, System.StubProvider stubProvider) { return null; }

    /**
     * Creates an instance of a stubbed SObject type that you can use to provide testing results in the extended System.SoqlStubProvider class.
     * Example
     * ssot__EmailEngagement__dlm engagement = (ssot__EmailEngagement__dlm)Test.createStubQueryRow(ssot__EmailEngagement__dlm.SObjectType,
     *     new Map<string, object> {
     *         'ssot__Name__c' => 'My Email Engagement',
     *         'ssot__CityName__c' => 'San Francisco'
     *     }
     * );
     * @return Returns the stubbed SObject to use in testing.
     */
    global static SObject createStubQueryRow(Schema.SObjectType targetType, Map fieldMapWithRelationshipKeys) { return null; }

    /**
     * Creates instances of stubbed SObject types that you can use to provide testing results in the extended System.SoqlStubProvider class.
     * Example
     * List<Map<String, Object>> engagementMaps = new List<Map<String, Object>>();
     * Map<String, Object> engagement = new Map<String, Object> {
     *         'ssot__Name__c' => 'My Email Engagement',
     *         'ssot__CityName__c' => 'San Francisco'
     * };
     * Map<String, Object> engagement2 = new Map<String, Object> {
     *         'ssot__Name__c' => 'My Other Email Engagement',
     *         'ssot__CityName__c' => 'New York'
     * };
     *
     * engagementMaps.add(engagement);
     * engagementMaps.add(engagement2);
     *
     * List<ssot__EmailEngagement__dlm> engagements = (List<ssot__EmailEngagement__dlm>)Test.createStubQueryRows(ssot__EmailEngagement__dlm.SObjectType,
     *     engagementMaps);
     * @return Returns a list of stubbed SObject types to use in testing.
     */
    global static List createStubQueryRows(Schema.SObjectType targetType, List fieldMapWithRelationshipKeysForMultipleRows) { return null; }

    /**
     * Use this method in an Apex test so that change event notifications are generated for all supported Change Data Capture entities. Call this method at the beginning of your test before performing DML operations and calling Test.getEventBus().deliver();.
     * Usage
     * The enableChangeDataCapture() method ensures that Apex tests can fire change event triggers regardless of the entities selected in Setup in the Change Data Capture page. The enableChangeDataCapture() method doesn’t affect the entities selected in Setup.
     */
    global static void enableChangeDataCapture() { }

    /**
     * Adds the specified number of jobs with no-operation contents to the test-context queue. It first fills the test batch queue, up to the maximum 5 jobs, and then places jobs in the test flex queue. It throws a limit exception when the number of jobs in the test flex queue exceeds the allowed limit of 100 jobs.
     * Usage
     * Use this method to reduce testing time. Instead of using your org's real batch jobs for testing, you can use this method to simulate batch-job enqueueing. Using enqueueBatchJobs(numberOfJobs) is faster than enqueuing real batch jobs.
     * @return A list of IDs of enqueued test jobs.
     */
    global static List enqueueBatchJobs(Integer n) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns an instance of the test event bus broker, which lets you operate on platform event or change event messages in an Apex test. For example, you can call Test.getEventBus().deliver() to deliver event messages.
     * Usage
     * Enclose Test.getEventBus().deliver() within the Test.startTest() and Test.stopTest() statement block.
     * Test.startTest();
     * // Create test events
     * // ...
     * // Publish test events with EventBus.publish()
     * // ...
     * // Deliver test events
     * Test.getEventBus().deliver();
     * // Perform validation
     * // ...
     * Test.stopTest();
     * @return A broker for the test event bus.
     */
    global static eventbus.TestBroker getEventBus() { return null; }

    global static System.ExternalServiceTest getExternalService() { return null; }

    /**
     * Returns an ordered list of job IDs for jobs in the test-context flex queue. The job at index 0 is the next job slated to run. This method returns only test-context results, even if it’s annotated with @IsTest(SeeAllData=true).
     * @return An ordered list of IDs of the jobs in the test’s flex queue.
     */
    global static List getFlexQueueOrder() { return null; }

    /**
     * Returns the ID of the standard price book in the organization.
     * Usage
     * This method returns the ID of the standard price book in your organization regardless of whether the test can query organization data. By default, tests can’t query organization data unless they’re annotated with @isTest(SeeAllData=true).
     * Creating price book entries with a standard price requires the ID of the standard price book. Use this method to get the standard price book ID so that you can create price book entries in your tests.
     * Example
     * This example creates some test data for price book entries. The test method in this example gets the standard price book ID and uses this ID to create a price book entry for a product with a standard price. Next, the test creates a custom price book and uses the ID of this custom price book to add a price book entry with a custom price.
     * @isTest
     * public class PriceBookTest {
     *     // Utility method that can be called by Apex tests to create price book entries.
     *     static testmethod void addPricebookEntries() {
     *         // First, set up test price book entries.
     *         // Insert a test product.
     *         Product2 prod = new Product2(Name = 'Laptop X200',
     *             Family = 'Hardware');
     *         insert prod;
     *
     *         // Get standard price book ID.
     *         // This is available irrespective of the state of SeeAllData.
     *         Id pricebookId = Test.getStandardPricebookId();
     *
     *         // 1. Insert a price book entry for the standard price book.
     *         // Standard price book entries require the standard price book ID we got earlier.
     *         PricebookEntry standardPrice = new PricebookEntry(
     *             Pricebook2Id = pricebookId, Product2Id = prod.Id,
     *             UnitPrice = 10000, IsActive = true);
     *         insert standardPrice;
     *
     *         // Create a custom price book
     *         Pricebook2 customPB = new Pricebook2(Name='Custom Pricebook', isActive=true);
     *         insert customPB;
     *
     *         // 2. Insert a price book entry with a custom price.
     *         PricebookEntry customPrice = new PricebookEntry(
     *             Pricebook2Id = customPB.Id, Product2Id = prod.Id,
     *             UnitPrice = 12000, IsActive = true);
     *         insert customPrice;
     *
     *         // Next, perform some tests with your test price book entries.
     *     }
     * }
     * @return The ID of the standard price book.
     */
    global static Id getStandardPricebookId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global static Object invokeContinuationMethod(Object controller, System.Continuation continuation) { return null; }

    global static Component.apex.page invokePage(System.PageReference p) { return null; }

    /**
     * Returns true if the currently executing code was called by code contained in a test method, false otherwise. Use this method if you need to run different code depending on whether it was being called from a test.
     */
    global static Boolean isRunningTest() { return false; }

    /**
     * Returns true if a SOQL stub is defined for an SObject type; otherwise returns false.
     */
    global static Boolean isSoqlStubDefined(Schema.SObjectType targetType) { return false; }

    /**
     * Inserts test records from the specified static resource .csv file and for the specified sObject type, and returns a list of the inserted sObjects.
     * Usage
     * You must create the static resource prior to calling this method. The static resource is a comma-delimited file ending with a .csv extension. The file contains field names and values for the test records. The first line of the file must contain the field names and subsequent lines are the field values. To learn more about static resources, see “Defining Static Resources” in the Salesforce online help.
     * Once you create a static resource for your .csv file, the static resource will be assigned a MIME type. Supported MIME types are:
     * text/csv
     * application/vnd.ms-excel
     * application/octet-stream
     * text/plain
     */
    global static List loadData(Schema.SObjectType sobjectType, String staticResourceName) { return null; }

    /**
     * Creates a new QuickAction.SendEmailQuickActionDefaults instance for testing a class implementing the QuickAction.QuickActionDefaultsHandler interface.
     * @return The default values used for an email message quick action.
     */
    global static QuickAction.SendEmailQuickActionDefaults newSendEmailQuickActionDefaults(Id contextId, Id replyToId) { return null; }

    /**
     * Sets a mock response for a continuation HTTP request in a test method.
     * Usage
     * Use the Test.setContinuationResponse and Test.invokeContinuationMethod methods to test continuations. In test context, callouts of continuations aren’t sent to the external service. By using these methods, you can set a mock response and cause the runtime to call the continuation callback method to process the mock response.
     * Call Test.setContinuationResponse before you call Test.invokeContinuationMethod. When you call Test.invokeContinuationMethod, the runtime executes the callback method that is associated with the continuation. The callback method processes the mock response that is set by Test.setContinuationResponse.
     */
    global static void setContinuationResponse(String label, System.HttpResponse response) { }

    /**
     * Sets CreatedDate for a test-context sObject.
     * Usage
     * All database changes are rolled back at the end of a test. You can’t use this method on records that existed before your test executed. You also can’t use setCreatedDate in methods annotated with @isTest(SeeAllData=true), because those methods have access to all data in your org. If you set CreatedDate to a future value, it can cause unexpected results. This method takes two parameters—an sObject ID and a Datetime value—neither of which can be null.
     * Insert your test record before you set its CreatedDate, as shown in this example.
     * @isTest
     * private class SetCreatedDateTest {
     *     static testMethod void testSetCreatedDate() {
     *         Account a = new Account(name='myAccount');
     *         insert a;
     *         Test.setCreatedDate(a.Id, DateTime.newInstance(2012,12,12));
     *         Test.startTest();
     *         Account myAccount = [SELECT Id, Name, CreatedDate FROM Account
     *                              WHERE Name ='myAccount' limit 1];
     *         System.assertEquals(myAccount.CreatedDate, DateTime.newInstance(2012,12,12));
     *         Test.stopTest();
     *     }
     * }
     */
    global static void setCreatedDate(Id id, Datetime dt) { }

    global static void setCurrentPage(Object pageReference) { }

    global static void setCurrentPageReference(Object pageReference) { }

    global static void setFixedSearchResults(List searchResultsIds) { }

    global static void setMock(System.Type interfaceType, Object mock) { }

    /**
     * Sets the application mode for an organization to read-only in an Apex test to simulate read-only mode during Salesforce upgrades and downtimes. The application mode is reset to the default mode at the end of each Apex test run.
     * Usage
     * Also see the getApplicationReadWriteMode() System method.
     * Do not use setReadOnlyApplicationMode for purposes unrelated to Read-Only Mode testing, such as simulating DML exceptions.
     * Example
     * The following example sets the application mode to read-only and attempts to insert a new account record, which results in the exception. It then resets the application mode and performs a successful insert.
     * @isTest
     * private class ApplicationReadOnlyModeTestClass {
     *   public static testmethod void test() {
     *     // Create a test account that is used for querying later.
     *     Account testAccount = new Account(Name = 'TestAccount');
     *     insert testAccount;
     *
     *     // Set the application read only mode.
     *     Test.setReadOnlyApplicationMode(true);
     *
     *     // Verify that the application is in read-only mode.
     *     System.assertEquals(
     *                ApplicationReadWriteMode.READ_ONLY,
     *                System.getApplicationReadWriteMode());
     *
     *     // Create a new account object.
     *     Account testAccount2 = new Account(Name = 'TestAccount2');
     *
     *     try {
     *       // Get the test account created earlier. Should be successful.
     *       Account testAccountFromDb =
     *         [SELECT Id, Name FROM Account WHERE Name = 'TestAccount'];
     *       System.assertEquals(testAccount.Id, testAccountFromDb.Id);
     *
     *       // Inserts should result in the InvalidReadOnlyUserDmlException
     *       // being thrown.
     *       insert testAccount2;
     *       System.assertEquals(false, true);
     *     } catch (System.InvalidReadOnlyUserDmlException e) {
     *       // Expected
     *     }
     *     // Insertion should work after read only application mode gets disabled.
     *     Test.setReadOnlyApplicationMode(false);
     *
     *     insert testAccount2;
     *     Account testAccount2FromDb =
     *        [SELECT Id, Name FROM Account WHERE Name = 'TestAccount2'];
     *     System.assertEquals(testAccount2.Id, testAccount2FromDb.Id);
     *   }
     * }
     */
    global static void setReadOnlyApplicationMode(Boolean readOnlyApplicationMode) { }

    /**
     * Marks the point in your test code when your test actually begins. Use this method when you are testing governor limits.
     * Usage
     * You can also use this method with stopTest to ensure that all asynchronous calls that come after the startTest method are run before doing any assertions or testing. Each test method is allowed to call this method only once. All of the code before this method should be used to initialize variables, populate data structures, and so on, allowing you to set up everything you need to run your test. Any code that executes after the call to startTest and before stopTest is assigned a new set of governor limits.
     */
    global static void startTest() { }

    /**
     * Marks the point in your test code when your test ends. Use this method in conjunction with the startTest method.
     * Usage
     * Each test method is allowed to call this method only once. Any code that executes after the stopTest method is assigned the original limits that were in effect before startTest was called. All asynchronous calls made after the startTest method are collected by the system. When stopTest is executed, all asynchronous processes are run synchronously.
     * Note
     * Asynchronous calls, such as @future or executeBatch, called in a startTest, stopTest block, do not count against your limits for the number of queued jobs.
     */
    global static void stopTest() { }

    global static void testInstall(System.InstallHandler script, System.Version version) { }

    global static void testInstall(System.InstallHandler script, System.Version version, Boolean isPush) { }

    global static void testInstall(System.InstallHandler script, System.Version version, Boolean isPush, Boolean isRunAsInstallUser) { }

    global static Messaging.ActionResult testNotificationActionHandler(Messaging.NotificationActionHandler handler, Messaging.ActionableNotification actionableNotification) { return null; }

    /**
     * Tests the implementation of the SandboxPostCopy Interface, which is used for specifying a script to run at the completion of a Sandbox copy. Tests run as the test initiator in the development environment.
     * Usage
     * This method throws a run-time exception if the test install fails.
     * Note
     * Salesforce recommends that you use the testSandboxPostCopyScript(script, organizationId, sandboxId, sandboxName, isRunAsAutoProcUser) overload instead of this method. When isRunAsAutoProcUser is true, the SandboxPostCopy script is tested with the same user access permissions as used by post-copy tasks during sandbox creation. Using the same permissions enables the test to better simulate the actual usage of the class, and to uncover potential issues.
     * Example
     * See SandboxPostCopy Example Implementation
     */
    global static void testSandboxPostCopyScript(System.SandboxPostCopy script, Id organizationId, Id sandboxId, String sandboxName) { }

    /**
     * Tests the implementation of the SandboxPostCopy Interface, which is used for specifying a script to run at the completion of a Sandbox copy. When RunAsAutoProcUser is true, tests run as Automated Process user in the development environment.
     * Usage
     * This method throws a run-time exception if the test install fails.
     * Example
     * See SandboxPostCopy Example Implementation
     */
    global static void testSandboxPostCopyScript(System.SandboxPostCopy script, Id organizationId, Id sandboxId, String sandboxName, Boolean isRunAsAutoProcUser) { }

    global static void testUninstall(System.UninstallHandler script) { }

    global static void testUninstall(System.UninstallHandler script, Boolean isRunAsInstallUser) { }

    global override virtual String toString() { return null; }
}