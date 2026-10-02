/**
 * Adds sorting support for Lists that contain non-primitive types, that is, Lists of user-defined types. Your implementation must explicitly handle null inputs in the compareTo() method to avoid a null pointer exception.
 * <p>Usage
 * To add List sorting support for your Apex class, you must implement the Comparable interface with its compareTo method in your class.
 * To implement the Comparable interface, you must first declare a class with the implements keyword as follows:
 * public with sharing class Employee implements Comparable {
 *     //implementation
 * }
 * Next, your class must provide an implementation for the following method:
 * public Integer compareTo(Object compareTo) {
 *     // Your code here
 * }
 * The implemented method must be declared as global or public.
 */
global interface Comparable {
    /**
     * Returns an Integer value that is the result of the comparison.
     * <p>Usage
     * The implementation of this method returns the following values:
     * 0 if this instance and objectToCompareTo are equal
     * > 0 if this instance is greater than objectToCompareTo
     * < 0 if this instance is less than objectToCompareTo
     * If this object instance and objectToCompareTo are incompatible, a System.TypeException is thrown.
     */
    abstract Integer compareTo(Object obj);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}