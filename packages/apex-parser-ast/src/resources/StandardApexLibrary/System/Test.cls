/**
 * Contains methods related to Apex tests.
 */
global class Test {

  public static void calculatePermissionSetGroup(List< String > psgIds) {}

  public static void calculatePermissionSetGroup(String psgId) {}

  /**
   * Clear the messages on a Visualforce page while executing Apex test methods.
   */
  public static void clearApexPageMessages() {}

  public static void createSoqlStub(Schema.SObjectType targetType, System.SoqlStubProvider soqlStub) {}

  /**
   * Creates a stubbed version of an Apex class that you can use for testing. This method is part of the Apex stub API. You can use it with the System.StubProvider interface to create a mocking framework.
   * @param parentType The type of the Apex class to be stubbed.
   * @param stubProvider 
   * @return Object
   */
  public static Object createStub(System.Type parentType, System.StubProvider stubProvider) {}

  public static SObject createStubQueryRow(Schema.SObjectType targetType, Object> fieldMapWithRelationshipKeys) {}

  public static List<SObject> createStubQueryRows(Schema.SObjectType targetType, Object>> fieldMapWithRelationshipKeysForMultipleRows) {}

  /**
   * Use this method in an Apex test so that change event notifications are generated for all supported Change Data Capture entities. Call this method at the beginning of your test before performing DML operations and calling Test.getEventBus().deliver(); .
   */
  public static void enableChangeDataCapture() {}

  /**
   * Adds the specified number of jobs with no-operation contents to the test-context queue. It first fills the test batch queue, up to the maximum 5 jobs, and then places jobs in the test flex queue. It throws a limit exception when the number of jobs in the test flex queue exceeds the allowed limit of 100 jobs.
   * @param numberOfJobs Number of test jobs to enqueue.
   * @return List<Id>
   */
  public static List<Id> enqueueBatchJobs(Integer numberOfJobs) {}

  /**
   * Returns an instance of the test event bus broker, which lets you operate on platform event or change event messages in an Apex test. For example, you can call Test.getEventBus().deliver() to deliver event messages.
   * @return EventBus.TestBroker
   */
  public static EventBus.TestBroker getEventBus() {}

  /**
   * Returns an ordered list of job IDs for jobs in the test-context flex queue. The job at index 0 is the next job slated to run. This method returns only test-context results, even if it’s annotated with @IsTest(SeeAllData=true) .
   * @return List<Id>
   */
  public static List<Id> getFlexQueueOrder() {}

  /**
   * Returns the ID of the standard price book in the organization.
   * @return Id
   */
  public static Id getStandardPricebookId() {}

  /**
   * Invokes the callback method for the specified controller and continuation in a test method.
   * @param controller An instance of the controller class that invokes the continuation request.
   * @param request The continuation that is returned by an action method in the controller class.
   * @return Object
   */
  public static Object invokeContinuationMethod(Object controller, Continuation request) {}

  /**
   * Returns true if the currently executing code was called by code contained in a test method, false otherwise. Use this method if you need to run different code depending on whether it was being called from a test.
   * @return Boolean
   */
  public static Boolean isRunningTest() {}

  public static Boolean isSoqlStubDefined(Schema.SObjectType targetType) {}

  /**
   * Inserts test records from the specified static resource .csv file and for the specified sObject type, and returns a list of the inserted sObjects.
   * @param sObjectToken The sObject type for which to insert test records.
   * @param resourceName The static resource that corresponds to the .csv file containing the test records to load. The name is case insensitive.
   * @return List<sObject>
   */
  public static List<sObject> loadData(Schema.SObjectType sObjectToken, String resourceName) {}

  /**
   * Creates a new QuickAction.SendEmailQuickActionDefaults instance for testing a class implementing the QuickAction.QuickActionDefaultsHandler interface.
   * @param contextId Parent record of the email message.
   * @param replyToId Previous email message ID if this email message is a reply.
   * @return QuickAction.SendEmailQuickActionDefaults
   */
  public static QuickAction.SendEmailQuickActionDefaults newSendEmailQuickActionDefaults(ID contextId, ID replyToId) {}

  /**
   * Sets a mock response for a continuation HTTP request in a test method.
   * @param requestLabel The unique label that corresponds to the continuation HTTP request. This label is returned by Continuation.addHttpRequest .
   * @param mockResponse The fake response to be returned by Test.invokeContinuationMethod .
   */
  public static void setContinuationResponse(String requestLabel, System.HttpResponse mockResponse) {}

  /**
   * Sets CreatedDate for a test-context sObject.
   * @param recordId The ID of an sObject.
   * @param createdDatetime The value to assign to the sObject’s CreatedDate field.
   */
  public static void setCreatedDate(Id recordId, Datetime createdDatetime) {}

  /**
   * A Visualforce test method that sets the current PageReference for the controller.
   * @param page 
   */
  public static void setCurrentPage(PageReference page) {}

  /**
   * A Visualforce test method that sets the current PageReference for the controller.
   * @param page 
   */
  public static void setCurrentPageReference(PageReference page) {}

  /**
   * Defines a list of fixed search results to be returned by all subsequent SOSL statements in a test method.
   * @param fixedSearchResults The list of record IDs specified by opt_set_search_results replaces the results that would normally be returned by the SOSL queries if they were not subject to any WHERE or LIMIT clauses. If these clauses exist in the SOSL queries, they are applied to the list of fixed search results.
   */
  public static void setFixedSearchResults(ID [] fixedSearchResults) {}

  /**
   * Sets the response mock mode and instructs the Apex runtime to send a mock response whenever a callout is made through the HTTP classes or the auto-generated code from WSDLs.
   * @param interfaceType 
   * @param instance 
   */
  public static void setMock(Type interfaceType, Object instance) {}

  /**
   * Sets the application mode for an organization to read-only in an Apex test to simulate read-only mode during Salesforce upgrades and downtimes. The application mode is reset to the default mode at the end of each Apex test run.
   * @param applicationMode 
   */
  public static void setReadOnlyApplicationMode(Boolean applicationMode) {}

  /**
   * Marks the point in your test code when your test actually begins. Use this method when you are testing governor limits.
   */
  public static void startTest() {}

  /**
   * Marks the point in your test code when your test ends. Use this method in conjunction with the startTest method.
   */
  public static void stopTest() {}

  /**
   * Tests the implementation of the InstallHandler interface, which is used for specifying a post install script in packages. Tests run as the test initiator in the development environment.
   * @param installImplementation A class that implements the InstallHandler interface.
   * @param version The version number of the existing package installed in the subscriber organization.
   * @param isPush (Optional) Specifies whether the upgrade is a push. The default value is false .
   */
  public static void testInstall(InstallHandler installImplementation, Version version, Boolean isPush) {}

  /**
   * Tests the implementation of the SandboxPostCopy Interface, which is used for specifying a script to run at the completion of a Sandbox copy. Tests run as the test initiator in the development environment.
   * @param script A class that implements the SandboxPostCopy interface.
   * @param organizationId The sandbox organization ID
   * @param sandboxId The sandbox ID to be provided to the SandboxPostCopy script.
   * @param sandboxName The sandbox name to be provided to the SandboxPostCopy script.
   */
  public static void testSandboxPostCopyScript(System.SandboxPostCopy script, Id organizationId, Id sandboxId, String sandboxName) {}

  /**
   * Tests the implementation of the SandboxPostCopy Interface, which is used for specifying a script to run at the completion of a Sandbox copy. Tests run as the test initiator in the development environment.
   * @param script A class that implements the SandboxPostCopy interface.
   * @param organizationId The sandbox organization ID
   * @param sandboxId The sandbox ID to be provided to the SandboxPostCopy script.
   * @param sandboxName The sandbox name to be provided to the SandboxPostCopy script.
   * @param RunAsAutoProcUser 
   */
  public static void testSandboxPostCopyScript(System.SandboxPostCopy script, Id organizationId, Id sandboxId, String sandboxName, Boolean RunAsAutoProcUser) {}

  /**
   * Tests the implementation of the UninstallHandler interface, which is used for specifying an uninstall script in packages. Tests run as the test initiator in the development environment.
   * @param uninstallImplementation A class that implements the UninstallHandler interface.
   */
  public static void testUninstall(UninstallHandler uninstallImplementation) {}

}