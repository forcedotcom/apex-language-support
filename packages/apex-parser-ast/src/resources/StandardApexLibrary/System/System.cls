/**
 * Contains methods for system operations, such as writing debug messages and scheduling jobs.
 */
global class System {

  public static void abortJob(String jobId) {}

  /**
   * Asserts that the specified condition is true. If it isn’t , a fatal error is returned that causes code execution to halt.
   * @param condition 
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void assert(Boolean condition, Object msg) {}

  /**
   * Asserts that the first two arguments are the same. If they aren’t, a fatal error is returned that causes code execution to halt.
   * @param expected Specifies the expected value.
   * @param actual Specifies the actual value.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void assertEquals(Object expected, Object actual, Object msg) {}

  /**
   * Asserts that the first two arguments are different. If they’re the same, a fatal error is returned that causes code execution to halt.
   * @param expected Specifies the expected value.
   * @param actual Specifies the actual value.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void assertNotEquals(Object expected, Object actual, Object msg) {}

  /**
   * Returns a reference to the current page. This is used with Visualforce pages.
   * @return System.PageReference
   */
  public static System.PageReference currentPageReference() {}

  /**
   * Returns the current time in milliseconds, which is expressed as the difference between the current time and midnight, January 1, 1970 UTC.
   * @return Long
   */
  public static Long currentTimeMillis() {}

  /**
   * Writes the specified message, in string format, to the execution debug log. The DEBUG log level is used.
   * @param msg 
   */
  public static void debug(Object msg) {}

  /**
   * Writes the specified message, in string format, to the execution debug log. The DEBUG log level is used.
   * @param logLevel 
   * @param msg 
   */
  public static void debug(LoggingLevel logLevel, Object msg) {}

  /**
   * Adds a job to the Apex job queue that corresponds to the specified queueable class and returns the job ID.
   * @param queueableObj An instance of the class that implements the Queueable Interface .
   * @return ID
   */
  public static ID enqueueJob(Object queueableObj) {}

  /**
   * Adds a job to the Apex job queue that corresponds to the specified queueable class and returns the job ID.
   * @param queueable 
   * @param delay 
   * @return Id
   */
  public static Id enqueueJob(Object queueable, Integer delay) {}

  /**
   * Adds a job to the Apex job queue that corresponds to the specified queueable class and returns the job ID.
   * @param queueable 
   * @param asyncoptions 
   * @return Id
   */
  public static Id enqueueJob(Object queueable, Object asyncoptions) {}

  /**
   * Returns true if both arguments are equal. Otherwise, returns false .
   * @param obj1 Object being compared.
   * @param obj2 Object to compare with the first argument.
   * @return Boolean
   */
  public static Boolean equals(Object obj1, Object obj2) {}

  /**
   * Returns the read write mode set for an organization during Salesforce.com upgrades and downtimes.
   * @return System.ApplicationReadWriteMode
   */
  public static System.ApplicationReadWriteMode getApplicationReadWriteMode() {}

  /**
   * Returns the short code for the Quiddity value of the current Request object.
   * @param QuiddityValue The Quiddity enum value that has an associated short code. This short code is used in Event Monitoring logs. For more information, see Apex Execution Event Type .
   * @return String
   */
  public String getQuiddityShortCode(System.Quiddity QuiddityValue) {}

  /**
   * Returns the hash code of the specified object.
   * @param obj The object to get the hash code for. This parameter can be of any type, including values or object references, such as sObjects or user-defined types.
   * @return Integer
   */
  public static Integer hashCode(Object obj) {}

  /**
   * Returns true if a batch Apex job invoked the executing code, or false if not. In API version 35.0 and earlier, also returns true if a queueable Apex job invoked the code.
   * @return Boolean
   */
  public static Boolean isBatch() {}

  /**
   * Returns true if an asynchronous Salesforce Function callback invoked the executing code, or false if not. Available in API version 51.0 and later.
   * @return Boolean
   */
  public static Boolean isFunctionCallback() {}

  /**
   * Returns true if the currently executing code is invoked by code contained in a method annotated with future ; false otherwise.
   * @return Boolean
   */
  public static Boolean isFuture() {}

  /**
   * Returns true if a queueable Apex job invoked the executing code. Returns false if not, including if a batch Apex job or a future method invoked the code.
   * @return Boolean
   */
  public static Boolean isQueueable() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  public static Boolean isRunningElasticCompute() {}

  /**
   * Returns true if the currently executing code is invoked by a scheduled Apex job; false otherwise.
   * @return Boolean
   */
  public static Boolean isScheduled() {}

  /**
   * Moves the specified user’s password to a different user.
   * @param targetUserId The user that the password is moved to.
   * @param sourceUserId The user that the password is moved from.
   */
  public static void movePassword(ID targetUserId, ID sourceUserId) {}

  /**
   * Returns the current date and time in the GMT time zone.
   * @return Datetime
   */
  public static Datetime now() {}

  public static void pauseJobById(String cronTriggerId) {}

  public static void pauseJobByName(String jobName) {}

  /**
   * Processes the list of work item IDs.
   * @param workItemIds 
   * @param action 
   * @param comments 
   * @param nextApprover 
   * @return List<Id>
   */
  public static List<Id> process(List<Id> workItemIds, String action, String comments, String nextApprover) {}

  /**
   * Deletes asynchronous Apex job records for jobs that have finished execution before the specified date with a Completed, Aborted, or Failed status, and returns the number of records deleted.
   * @param dt Specifies the date up to which old records are deleted. The date comparison is based on the CompletedDate field of AsyncApexJob, which is in the GMT time zone.
   * @return Integer
   */
  public static Integer purgeOldAsyncJobs(Date dt) {}

  /**
   * Deletes asynchronous Apex job records for jobs that have finished execution before the specified date with a Completed, Aborted, or Failed status, and returns the number of records deleted.
   * @param dt Specifies the date up to which old records are deleted. The date comparison is based on the CompletedDate field of AsyncApexJob, which is in the GMT time zone.
   * @param numOfJobs 
   * @return Integer
   */
  public static Integer purgeOldAsyncJobs(Date dt, Integer numOfJobs) {}

  public static System.Version requestVersion() {}

  /**
   * Resets the password for the specified user.
   * @param userId 
   * @param sendUserEmail 
   * @return System.ResetPasswordResult
   */
  public static System.ResetPasswordResult resetPassword(ID userId, Boolean sendUserEmail) {}

  /**
   * Resets the user's password and sends an email to the user with their new password. You specify the email template that is sent to the specified user. Use this method for external users of Experience Cloud sites.
   * @param userId The ID of the user whose password was reset.
   * @param sendUserEmail 
   * @param emailTemplateName Name of the email template.
   * @return System.ResetPasswordResult
   */
  public static System.ResetPasswordResult resetPasswordWithEmailTemplate(Id userId, Boolean sendUserEmail, String emailTemplateName) {}

  public static void resumeJobById(String cronTriggerId) {}

  public static void resumeJobByName(String jobName) {}

  /**
   * Changes the current package version to the package version specified in the argument.
   * @param version 
   */
  public static void runAs(System.Version version) {}

  /**
   * Changes the current package version to the package version specified in the argument.
   * @param userSObject 
   */
  public static void runAs(User userSObject) {}

  /**
   * Use schedule with an Apex class that implements the Schedulable interface to schedule the class to run at the time specified by a Cron expression.
   * @param jobName 
   * @param cronExpression 
   * @param schedulableClass 
   * @return String
   */
  public static String schedule(String jobName, String cronExpression, Object schedulableClass) {}

  /**
   * Schedules a batch job to run once in the future after the specified time interval and with the specified job name.
   * @param batchable An instance of a class that implements the Database.Batchable interface.
   * @param jobName The name of the job that this method will start.
   * @param minutesFromNow The time interval in minutes after which the job should start executing. This argument must be greater than zero.
   * @return String
   */
  public static String scheduleBatch(Database.Batchable batchable, String jobName, Integer minutesFromNow) {}

  /**
   * Schedules a batch job to run once in the future after the specified time interval and with the specified job name.
   * @param batchable An instance of a class that implements the Database.Batchable interface.
   * @param jobName The name of the job that this method will start.
   * @param minutesFromNow The time interval in minutes after which the job should start executing. This argument must be greater than zero.
   * @param scopeSize 
   * @return String
   */
  public static String scheduleBatch(Database.Batchable batchable, String jobName, Integer minutesFromNow, Integer scopeSize) {}

  /**
   * Sets the password for the specified user.
   * @param userId 
   * @param password 
   */
  public static void setPassword(ID userId, String password) {}

  /**
   * Submits the processed approvals. The current user is the submitter and the entry criteria is evaluated for all processes applicable to the current user.
   * @param workItemIds 
   * @param comments 
   * @param nextApprover 
   * @return List< ID >
   */
  public static List< ID > submit(List< ID > workItemIds, String comments, String nextApprover) {}

  /**
   * Returns the current date in the current user's time zone.
   * @return Date
   */
  public static Date today() {}

}