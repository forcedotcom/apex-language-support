/**
 * An instance of UpsertContext is passed to the upsertRows() method on your Datasource.Connection class. This class provides context information about the upsert request to the implementor of upsertRows().
 * <p>Usage
 * The Apex Connector Framework creates the contet for operations. Context is comprised of parameters about the operations, which other methods can use. An instance of the UpsertContext class packages these parameters into an object that can be used when an upsertRows() operation is initiated.
 */
global class UpsertContext {
    /**
     * List of rows corresponding to the external object records to upsert.
     * <p>List<Map<String,Object>>
     */
    global List rows { get; set; }
    /**
     * The name of the table to upsert rows in.
     * <p>String
     */
    global String tableSelected { get; set; }

    global UpsertContext() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}