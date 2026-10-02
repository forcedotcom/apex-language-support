/**
 * Represents an iterator over a query locator record set.
 * <p>Example
 * This sample shows how to obtain an iterator for a query locator, which contains five accounts. This sample calls hasNext and next to get each record in the collection.
 * // Get a query locator
 * Database.QueryLocator q = Database.getQueryLocator(
 *     [SELECT Name FROM Account LIMIT 5]);
 * // Get an iterator
 * Database.QueryLocatorIterator it =  q.iterator();
 *
 * // Iterate over the records
 * while (it.hasNext())
 * {
 *     Account a = (Account)it.next();
 *     System.debug(a);
 * }
 */
global class QueryLocatorIterator implements System.Iterator {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns true if there are one or more records remaining in the collection; otherwise, returns false.
     */
    global Boolean hasNext() { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Advances the iterator to the next sObject record and returns the sObject.
     * <p>Usage
     * Because the return value is the generic sObject type, you must cast it if using a more specific type. For example:
     * Account a = (Account)myIterator.next();
     * <p>Example
     * Account a = (Account)myIterator.next();
     */
    global SObject next() { return null; }

    global override virtual String toString() { return null; }
}