/**
 * Is an abstract base class for an object that provides standard filter information.
 */
global virtual class StandardFilterInfo {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the display label of the standard filter.
     */
    global String getLabel() { return null; }

    /**
     * Returns the type of standard filter.
     */
    global reports.StandardFilterType getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}