/**
 * Represents the record set returned by Database.getQueryLocator and used with Batch Apex.
 */
global class QueryLocator implements System.Iterable {
    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the query used to instantiate the Database.QueryLocator object. This is useful when testing the start method.
     * <p>Usage
     * You can’t use the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_locking_statements.htm" target="_blank">FOR UPDATE keywords</a> with a getQueryLocator query to lock a set of records. The set of records in the batch is determined when the start method is run.
     * <p>Example
     * System.assertEquals(QLReturnedFromStart.
     * getQuery(),
     * Database.getQueryLocator([SELECT Id
     *    FROM Account]).getQuery() );
     */
    global String getQuery() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns a new instance of a query locator iterator.
     * <p>Usage
     * Warning
     * To iterate over a query locator, save the iterator instance that this method returns in a variable and then use this variable to iterate over the collection. Calling iterator every time you want to perform an iteration can result in incorrect behavior because each call returns a new iterator instance.
     * For an example, see QueryLocatorIterator Class.
     */
    global Database.QueryLocatorIterator iterator() { return null; }

    global List querymore(Integer num) { return null; }

    global String toString() { return null; }
}