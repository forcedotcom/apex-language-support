/**
 * A wrapper object that contains an sObject and search metadata.
 */
global class SearchResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns an sObject from a SearchResult object.
     */
    global SObject getSObject() { return null; }

    /**
     * Returns a snippet from a SearchResult object based on the default field.
     */
    global String getSnippet() { return null; }

    /**
     * Returns a snippet from a Case, Feed, or Knowledge Article SearchResult object based on the specified field name.
     */
    global String getSnippet(String field) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}