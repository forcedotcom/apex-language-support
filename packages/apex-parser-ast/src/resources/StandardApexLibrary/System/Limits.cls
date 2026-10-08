/**
 * Contains methods that return limit information for specific resources.
 * Usage
 * The Limits methods return the specific limit for the particular governor, such as the number of calls of a method or the amount of heap size remaining.
 * Because Apex runs in a multitenant environment, the Apex runtime engine strictly enforces a number of limits to ensure that runaway Apex doesn’t monopolize shared resources.
 * None of the Limits methods require an argument. The format of the limits methods is as follows:
 * myDMLLimit = Limits.getDMLStatements();
 * There are two versions of every method: the first returns the amount of the resource that has been used while the second version contains the word limit and returns the total amount of the resource that is available.
 * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_gov_limits.htm" target="_blank">Execution Governors and Limits</a>.
 */
global class Limits {
    /**
     * Returns the number of aggregate queries that have been processed with any SOQL query statement.
     */
    global static Integer getAggregateQueries() { return 0; }

    /**
     * Gets the number of rows returned by an Apex cursor.
     */
    global static Integer getApexCursorRows() { return 0; }

    /**
     * Gets the number of Apex cursors that are created.
     */
    global static Integer getApexCursors() { return 0; }

    /**
     * Gets the number of rows returned by an Apex pagination cursor.
     */
    global static Integer getApexPaginationCursorRows() { return 0; }

    /**
     * Gets the number of Apex pagination cursors that are created.
     */
    global static Integer getApexPaginationCursors() { return 0; }

    /**
     * Returns the number of Web service statements that have been processed.
     */
    global static Integer getCallouts() { return 0; }

    /**
     * Deprecated. Returns the number of child relationship objects that have been returned.
     * Usage
     * Note
     * Because describe limits are no longer enforced in any API version, this method is no longer available. In API version 30.0 and earlier, this method is available but is deprecated.
     */
    global static Integer getChildRelationshipsDescribes() { return 0; }

    /**
     * Returns the CPU time (in milliseconds) that has been used in the current transaction.
     */
    global static Integer getCpuTime() { return 0; }

    global static Integer getDataCloudCursorRows() { return 0; }

    global static Integer getDataCloudCursors() { return 0; }

    global static Integer getDataCloudFlexCredits() { return 0; }

    global static Integer getDatabaseTime() { return 0; }

    /**
     * Returns the number of records that have been processed with any statement that counts against DML limits, such as DML statements, the Database.emptyRecycleBin method, and other methods.
     */
    global static Integer getDmlRows() { return 0; }

    /**
     * Returns the number of DML statements (such as insert, update or the database.EmptyRecycleBin method) that have been called.
     */
    global static Integer getDmlStatements() { return 0; }

    /**
     * Returns the number of email invocations (such as sendEmail) that have been called.
     */
    global static Integer getEmailInvocations() { return 0; }

    /**
     * Gets the number of fetch calls on an Apex cursor.
     */
    global static Integer getFetchCallsOnApexCursor() { return 0; }

    global static Integer getFieldSetsDescribes() { return 0; }

    global static Integer getFieldsDescribes() { return 0; }

    /**
     * Deprecated. Returns the same value as getSoslQueries. The number of findSimilar methods is no longer a separate limit, but is tracked as the number of SOSL queries issued.
     */
    global static Integer getFindSimilarCalls() { return 0; }

    /**
     * Returns the number of methods with the future annotation that have been executed (not necessarily completed).
     */
    global static Integer getFutureCalls() { return 0; }

    /**
     * Returns the approximate amount of memory (in bytes) that has been used for the heap.
     */
    global static Integer getHeapSize() { return 0; }

    /**
     * Returns the total number of aggregate queries that can be processed with SOQL query statements.
     */
    global static Integer getLimitAggregateQueries() { return 0; }

    /**
     * Gets the maximum number of rows that can be returned by an Apex cursor.
     */
    global static Integer getLimitApexCursorRows() { return 0; }

    /**
     * Gets the maximum number of Apex cursors that can be created in a 24-hour period.
     */
    global static Integer getLimitApexCursors() { return 0; }

    /**
     * Gets the maximum number of rows that can be returned by an Apex pagination cursor.
     */
    global static Integer getLimitApexPaginationCursorRows() { return 0; }

    /**
     * Gets the maximum number of Apex pagination cursors that can be created in a 24-hour period.
     */
    global static Integer getLimitApexPaginationCursors() { return 0; }

    /**
     * Returns the total number of Web service statements that can be processed.
     */
    global static Integer getLimitCallouts() { return 0; }

    global static Integer getLimitChildRelationshipsDescribes() { return 0; }

    /**
     * Returns the maximum CPU time (in milliseconds) that can be used in a transaction.
     */
    global static Integer getLimitCpuTime() { return 0; }

    global static Integer getLimitDataCloudCursorRows() { return 0; }

    global static Integer getLimitDataCloudCursors() { return 0; }

    global static Integer getLimitDataCloudFlexCredits() { return 0; }

    global static Integer getLimitDatabaseTime() { return 0; }

    /**
     * Returns the total number of records that can be processed with any statement that counts against DML limits, such as DML statements, the database.EmptyRecycleBin method, and other methods.
     */
    global static Integer getLimitDmlRows() { return 0; }

    /**
     * Returns the total number of DML statements or the database.EmptyRecycleBin methods that can be called.
     */
    global static Integer getLimitDmlStatements() { return 0; }

    /**
     * Returns the total number of email invocation (such as sendEmail) that can be called.
     */
    global static Integer getLimitEmailInvocations() { return 0; }

    /**
     * Gets the maximum number of fetch calls that can be made on an Apex cursor.
     */
    global static Integer getLimitFetchCallsOnApexCursor() { return 0; }

    global static Integer getLimitFieldSetsDescribes() { return 0; }

    global static Integer getLimitFieldsDescribes() { return 0; }

    /**
     * Deprecated. Returns the same value as getLimitSoslQueries. The number of findSimilar methods is no longer a separate limit, but is tracked as the number of SOSL queries issued.
     */
    global static Integer getLimitFindSimilarCalls() { return 0; }

    /**
     * Returns the total number of methods with the future annotation that can be executed (not necessarily completed).
     */
    global static Integer getLimitFutureCalls() { return 0; }

    /**
     * Returns the total amount of memory (in bytes) that can be used for the heap.
     */
    global static Integer getLimitHeapSize() { return 0; }

    /**
     * Returns the total number of Apex calls that are allowed per transaction for mobile push notifications.
     */
    global static Integer getLimitMobilePushApexCalls() { return 0; }

    global static Integer getLimitPicklistDescribes() { return 0; }

    /**
     * Returns the total number of EventBus.publish statements that can be called for platform events configured to publish immediately.
     */
    global static Integer getLimitPublishImmediateDML() { return 0; }

    /**
     * Returns the total number of SOQL queries that can be issued.
     */
    global static Integer getLimitQueries() { return 0; }

    /**
     * Returns the total number of records that can be returned by the Database.getQueryLocator method.
     */
    global static Integer getLimitQueryLocatorRows() { return 0; }

    /**
     * Returns the total number of records that can be returned by issuing SOQL queries.
     */
    global static Integer getLimitQueryRows() { return 0; }

    /**
     * Returns the maximum number of queueable jobs that can be added to the queue per transaction. A queueable job corresponds to a class that implements the Queueable interface.
     */
    global static Integer getLimitQueueableJobs() { return 0; }

    global static Integer getLimitRecordTypesDescribes() { return 0; }

    /**
     * Deprecated. Returns the same value as getLimitDMLStatements.
     * Usage
     * The number of RunAs methods is no longer a separate limit, but is tracked as the number of DML statements issued.
     */
    global static Integer getLimitRunAs() { return 0; }

    /**
     * Deprecated. Returns the same value as getLimitDMLStatements.
     * Usage
     * The number of Rollback methods is no longer a separate limit, but is tracked as the number of DML statements issued.
     */
    global static Integer getLimitSavepointRollbacks() { return 0; }

    /**
     * Deprecated. Returns the same value as getLimitDMLStatements.
     * Usage
     * The number of setSavepoint methods is no longer a separate limit, but is tracked as the number of DML statements issued.
     */
    global static Integer getLimitSavepoints() { return 0; }

    global static Integer getLimitScriptStatements() { return 0; }

    /**
     * Returns the total number of SOSL queries that can be issued.
     */
    global static Integer getLimitSoslQueries() { return 0; }

    /**
     * Returns the number of Apex calls that have been used by mobile push notifications during the current metering interval.
     */
    global static Integer getMobilePushApexCalls() { return 0; }

    global static Integer getPicklistDescribes() { return 0; }

    /**
     * Returns the number of EventBus.publish calls that have been made for platform events configured to publish immediately.
     */
    global static Integer getPublishImmediateDML() { return 0; }

    /**
     * Returns the number of SOQL queries that have been issued.
     */
    global static Integer getQueries() { return 0; }

    /**
     * Returns the number of records that have been returned by the Database.getQueryLocator method.
     */
    global static Integer getQueryLocatorRows() { return 0; }

    /**
     * Returns the number of records that have been returned by issuing SOQL queries.
     */
    global static Integer getQueryRows() { return 0; }

    /**
     * Returns the number of queueable jobs that have been added to the queue per transaction. A queueable job corresponds to a class that implements the Queueable interface.
     */
    global static Integer getQueueableJobs() { return 0; }

    global static Integer getRecordTypesDescribes() { return 0; }

    /**
     * Deprecated. Returns the same value as getDMLStatements.
     * Usage
     * The number of RunAs methods is no longer a separate limit, but is tracked as the number of DML statements issued.
     */
    global static Integer getRunAs() { return 0; }

    /**
     * Deprecated. Returns the same value as getDMLStatements.
     * Usage
     * The number of Rollback methods is no longer a separate limit, but is tracked as the number of DML statements issued.
     */
    global static Integer getSavepointRollbacks() { return 0; }

    /**
     * Deprecated. Returns the same value as getDMLStatements.
     * Usage
     * The number of setSavepoint methods is no longer a separate limit, but is tracked as the number of DML statements issued.
     */
    global static Integer getSavepoints() { return 0; }

    global static Integer getScriptStatements() { return 0; }

    /**
     * Returns the number of SOSL queries that have been issued.
     */
    global static Integer getSoslQueries() { return 0; }
}