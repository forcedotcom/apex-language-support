/**
 * Contains information for each row or column grouping.
 */
global class Dimension {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns information for each row or column grouping as a list.
     */
    global List getGroupings() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}