/**
 * Represents the categories within a category group.
 * Usage
 * The Schema.DataCategory object is returned by the getTopCategories method.
 */
global class DataCategory {
    global List childcategories { get; }
    global String label { get; }
    global String name { get; }

    global Boolean equals(Object obj) { return false; }

    global List getChildCategories() { return null; }

    /**
     * Returns the label for the data category used in the Salesforce user interface.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique name used by the API to access to the data category.
     */
    global String getName() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}