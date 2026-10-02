/**
 * Represents the parameter type of a method in a class that implements the Schedulable interface and contains the scheduled job ID. This interface is implemented internally by Apex.
 */
global interface SchedulableContext {
    virtual Boolean equals(Object arg0);

    /**
     * Returns the ID of the CronTrigger scheduled job.
     */
    abstract Id getTriggerId();

    virtual Integer hashCode();

    virtual String toString();
}