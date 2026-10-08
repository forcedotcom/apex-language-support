/**
 * Enables the asynchronous execution of Apex jobs that can be monitored.
 * Usage
 * To execute Apex as an asynchronous job, implement the Queueable interface and add the processing logic in your implementation of the execute method.
 * To implement the Queueable interface, you must first declare a class with the implements keyword as follows:
 * public class MyQueueableClass implements Queueable {
 * Next, your class must provide an implementation for the following method:
 * public void execute(QueueableContext context) {
 *     // Your code here
 * }
 * Your class and method implementation must be declared as public or global.
 * To submit your class for asynchronous execution, call the System.enqueueJob by passing it an instance of your class implementation of the Queueable interface as follows:
 * ID jobID = System.enqueueJob(new MyQueueableClass());
 */
global interface Queueable {
    virtual Boolean equals(Object arg0);

    abstract void execute(System.QueueableContext context);

    virtual Integer hashCode();

    virtual String toString();
}