/**
 * The class that implements this interface can be executed as a batch Apex job.
 */
global interface Batchable {
    virtual Boolean equals(Object arg0);

    abstract void execute(Database.BatchableContext context, List scope);

    /**
     * Gets invoked when the batch job finishes. Place any clean up code in this method.
     */
    abstract void finish(Database.BatchableContext context);

    virtual Integer hashCode();

    abstract System.Iterable start(Database.BatchableContext context);

    virtual String toString();
}