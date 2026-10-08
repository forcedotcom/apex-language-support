/**
 * Implement different sort orders with the Comparator interface’s compare() method, and pass the Comparator as a parameter to List.sort(). Your implementation must explicitly handle null inputs in the compare() method to avoid a null pointer exception.
 */
global interface Comparator {
    /**
     * Compares the two arguments and returns a negative integer, zero, or a positive integer depending on whether the first argument is less than, equal to, or greater than the second argument.
     */
    abstract Integer compare(t o1, t o2);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}