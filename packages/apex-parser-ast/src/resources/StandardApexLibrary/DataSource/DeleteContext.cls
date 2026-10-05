/**
 * An instance of DeleteContext is passed to the deleteRows() method on your Database.Connection class. The class provides context information about the delete request to the implementor of deleteRows().
 * <p>Usage
 * The Apex Connector Framework creates context for operations. Context is comprised of parameters about the operations, which other methods can use. An instance of the DeleteContext class packages these parameters into an object that can be used when a deleteRows() operation is initiated.
 */
global class DeleteContext {
    /**
     * The external IDs of the rows representing external object records to delete.
     * <p>List<String>
     */
    global List externalIds { get; set; }
    /**
     * The name of the table to delete rows from.
     * <p>String
     */
    global String tableSelected { get; set; }

    global DeleteContext() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}