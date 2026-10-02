/**
 * Contains information about the type of work to be performed.
 * <p>Usage
 * The constructor for this class can’t be called directly. Create an instance of this class using the WorkTypeBuilder.build() method.
 */
global without sharing class WorkType {
    global Object WorkType() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}