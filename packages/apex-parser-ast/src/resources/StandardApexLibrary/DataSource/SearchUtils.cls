/**
 * Helper class for implementing search on a custom adapter for Salesforce Connect.
 * <p>Usage
 * We recommend that you develop your own search implementation that can search columns in addition to the designated name field.
 */
global class SearchUtils {
    global Object SearchUtils() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Queries all the tables and returns each row whose designated name field contains the search phrase.
     */
    global static List searchByName(DataSource.SearchContext c, DataSource.Connection conn) { return null; }

    global override virtual String toString() { return null; }
}