/**
 * The class that implements this interface can be scheduled to run at different intervals.
 */
global interface Schedulable {
    virtual Boolean equals(Object arg0);

    abstract void execute(System.SchedulableContext ctx);

    virtual Integer hashCode();

    virtual String toString();
}