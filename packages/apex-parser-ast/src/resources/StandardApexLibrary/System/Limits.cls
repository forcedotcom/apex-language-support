/**
 * Contains methods that return limit information for specific resources.
 */
public class Limits {

  /**
   * Returns the number of aggregate queries that have been processed with any SOQL query statement.
   * @return Integer
   */
  public static Integer getAggregateQueries() {}

  /**
   * Returns the total number of aggregate queries that can be processed with SOQL query statements.
   * @return Integer
   */
  public static Integer getLimitAggregateQueries() {}

  /**
   * Reserved for future use.
   * @return Integer
   */
  public static Integer getAsyncCalls() {}

  /**
   * Reserved for future use.
   * @return Integer
   */
  public static Integer getLimitAsyncCalls() {}

  /**
   * Returns the number of Web service statements that have been processed.
   * @return Integer
   */
  public static Integer getCallouts() {}

  /**
   * Deprecated. Returns the number of child relationship objects that have been returned.
   * @return Integer
   */
  public static Integer getChildRelationshipsDescribes() {}

  /**
   * Returns the total number of Web service statements that can be processed.
   * @return Integer
   */
  public static Integer getLimitCallouts() {}

  /**
   * Returns the CPU time (in milliseconds) that has been used in the current transaction.
   * @return Integer
   */
  public static Integer getCpuTime() {}

  /**
   * Returns the maximum CPU time (in milliseconds) that can be used in a transaction.
   * @return Integer
   */
  public static Integer getLimitCpuTime() {}

  /**
   * Returns the number of records that have been processed with any statement that counts against DML limits, such as DML statements, the Database.emptyRecycleBin method, and other methods.
   * @return Integer
   */
  public static Integer getDMLRows() {}

  /**
   * Returns the total number of records that can be processed with any statement that counts against DML limits, such as DML statements, the database.EmptyRecycleBin method, and other methods.
   * @return Integer
   */
  public static Integer getLimitDMLRows() {}

  /**
   * Returns the number of DML statements (such as insert , update or the database.EmptyRecycleBin method) that have been called.
   * @return Integer
   */
  public static Integer getDMLStatements() {}

  /**
   * Returns the total number of DML statements or the database.EmptyRecycleBin methods that can be called.
   * @return Integer
   */
  public static Integer getLimitDMLStatements() {}

  /**
   * Returns the number of email invocations (such as sendEmail ) that have been called.
   * @return Integer
   */
  public static Integer getEmailInvocations() {}

  /**
   * Returns the total number of email invocation (such as sendEmail ) that can be called.
   * @return Integer
   */
  public static Integer getLimitEmailInvocations() {}

  /**
   * Deprecated. Returns the same value as getSoslQueries . The number of findSimilar methods is no longer a separate limit, but is tracked as the number of SOSL queries issued.
   * @return Integer
   */
  public static Integer getFindSimilarCalls() {}

  /**
   * Deprecated. Returns the same value as getLimitSoslQueries . The number of findSimilar methods is no longer a separate limit, but is tracked as the number of SOSL queries issued.
   * @return Integer
   */
  public static Integer getLimitFindSimilarCalls() {}

  /**
   * Returns the number of methods with the future annotation that have been executed (not necessarily completed).
   * @return Integer
   */
  public static Integer getFutureCalls() {}

  /**
   * Returns the total number of methods with the future annotation that can be executed (not necessarily completed).
   * @return Integer
   */
  public static Integer getLimitFutureCalls() {}

  /**
   * Returns the approximate amount of memory (in bytes) that has been used for the heap.
   * @return Integer
   */
  public static Integer getHeapSize() {}

  /**
   * Returns the total amount of memory (in bytes) that can be used for the heap.
   * @return Integer
   */
  public static Integer getLimitHeapSize() {}

  /**
   * Returns the number of Apex calls that have been used by mobile push notifications during the current metering interval.
   * @return Integer
   */
  public static Integer getMobilePushApexCalls() {}

  /**
   * Returns the total number of Apex calls that are allowed per transaction for mobile push notifications.
   * @return Integer
   */
  public static Integer getLimitMobilePushApexCalls() {}

  /**
   * Returns the number of EventBus.publish calls that have been made for platform events configured to publish immediately.
   * @return Integer
   */
  public static Integer getPublishImmediateDML() {}

  /**
   * Returns the total number of EventBus.publish statements that can be called for platform events configured to publish immediately.
   * @return Integer
   */
  public static Integer getLimitPublishImmediateDML() {}

  /**
   * Returns the number of SOQL queries that have been issued.
   * @return Integer
   */
  public static Integer getQueries() {}

  /**
   * Returns the total number of SOQL queries that can be issued.
   * @return Integer
   */
  public static Integer getLimitQueries() {}

  /**
   * Returns the number of records that have been returned by the Database.getQueryLocator method.
   * @return Integer
   */
  public static Integer getQueryLocatorRows() {}

  /**
   * Returns the total number of records that can be returned by the Database.getQueryLocator method.
   * @return Integer
   */
  public static Integer getLimitQueryLocatorRows() {}

  /**
   * Returns the number of records that have been returned by issuing SOQL queries.
   * @return Integer
   */
  public static Integer getQueryRows() {}

  /**
   * Returns the total number of records that can be returned by issuing SOQL queries.
   * @return Integer
   */
  public static Integer getLimitQueryRows() {}

  /**
   * Returns the number of queueable jobs that have been added to the queue per transaction. A queueable job corresponds to a class that implements the Queueable interface.
   * @return Integer
   */
  public static Integer getQueueableJobs() {}

  /**
   * Returns the maximum number of queueable jobs that can be added to the queue per transaction. A queueable job corresponds to a class that implements the Queueable interface.
   * @return Integer
   */
  public static Integer getLimitQueueableJobs() {}

  /**
   * Deprecated. Returns the same value as getDMLStatements .
   * @return Integer
   */
  public static Integer getRunAs() {}

  /**
   * Deprecated. Returns the same value as getLimitDMLStatements .
   * @return Integer
   */
  public static Integer getLimitRunAs() {}

  /**
   * Deprecated. Returns the same value as getDMLStatements .
   * @return Integer
   */
  public static Integer getSavepointRollbacks() {}

  /**
   * Deprecated. Returns the same value as getLimitDMLStatements .
   * @return Integer
   */
  public static Integer getLimitSavepointRollbacks() {}

  /**
   * Deprecated. Returns the same value as getDMLStatements .
   * @return Integer
   */
  public static Integer getSavepoints() {}

  /**
   * Deprecated. Returns the same value as getLimitDMLStatements .
   * @return Integer
   */
  public static Integer getLimitSavepoints() {}

  /**
   * Returns the number of SOSL queries that have been issued.
   * @return Integer
   */
  public static Integer getSoslQueries() {}

  /**
   * Returns the total number of SOSL queries that can be issued.
   * @return Integer
   */
  public static Integer getLimitSoslQueries() {}

}