/**
 * Wraps the results returned by the Search.find(String) method.
 */
global class SearchResults {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a list of Search.SearchResult objects that contain an sObject of the specified type.
     * <p>Usage
     * SOSL queries passed to the Search.find(String) method can return results for multiple objects. For example, the query Search.find('FIND \'map\' IN ALL FIELDS RETURNING Account, Contact, Opportunity') includes results for 3 objects. You can call get(string) to retrieve search results for 1 object at a time. For example, to get results for the Account object, call Search.SearchResults.get('Account').
     */
    global List get(String sObjectType) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}