/**
 * Contains helper methods to locally filter, sort, and apply limit and offset clauses to data rows. This helper class is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
 * Usage
 * The DataSource.QueryUtils class and its helper methods can process query results locally within your Salesforce org. This class is provided for your convenience to simplify the development of your Salesforce Connect custom adapter for initial tests. However, the DataSource.QueryUtils class and its methods aren’t supported for use in production environments that use callouts to retrieve data from external systems. Complete the filtering and sorting on the external system before sending the query results to Salesforce. When possible, use server-driven paging or another technique to have the external system determine the appropriate data subsets according to the limit and offset clauses in the query.
 */
global class QueryUtils {
    global QueryUtils() { }

    /**
     * Returns a subset of data rows after locally applying limit and offset clauses from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
     */
    global static List applyLimitAndOffset(DataSource.QueryContext c, List rows) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a subset of data rows after locally ordering and applying filters from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
     */
    global static List filter(DataSource.QueryContext c, List rows) { return null; }

    global static List filterAndSort(DataSource.QueryContext c, List rows) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns data rows after locally filtering, sorting, ordering, and applying limit and offset clauses from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
     */
    global static List process(DataSource.QueryContext c, List rows) { return null; }

    global static List sort(DataSource.QueryContext c, List rows) { return null; }

    global override virtual String toString() { return null; }
}