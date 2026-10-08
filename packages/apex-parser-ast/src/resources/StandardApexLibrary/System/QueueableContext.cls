/**
 * Represents the parameter type of the execute() method in a class that implements the Queueable interface and contains the job ID. This interface is implemented internally by Apex.
 */
global interface QueueableContext {
    virtual Boolean equals(Object arg0);

    /**
     * Returns the ID of the submitted job that uses the Queueable interface.
     * @return The ID of the submitted job.
     */
    abstract Id getJobId();

    virtual Integer hashCode();

    virtual String toString();
}