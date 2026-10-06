/**
 * Contains information about the report values included in a bucket field.
 */
global class BucketFieldValue {
    /**
     * Creates an instance of the Reports.BucketFieldValue class. You can then set values by using the class’s set methods.
     */
    global BucketFieldValue() { }

    /**
     * Creates an instance of the Reports.BucketFieldValue class using the specified parameters.
     */
    global BucketFieldValue(String label, List sourceDimensionValues, Double rangeUpperBound) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the user-facing name of the bucket category.
     */
    global String getLabel() { return null; }

    /**
     * Returns the greatest range limit under which values are included in this bucket category (in buckets of type NUMBER).
     */
    global Double getRangeUpperBound() { return 0.0; }

    /**
     * Returns a list of the values from the source field included in this bucket category (in buckets of type PICKLIST and buckets of type TEXT).
     */
    global List getSourceDimensionValues() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Set the user-facing name of the bucket category.
     */
    global void setLabel(String label) { }

    /**
     * Sets the greatest limit of a range under which values are included in this bucket category (in buckets of type NUMBER).
     */
    global void setRangeUpperBound(Double rangeUpperBound) { }

    /**
     * Specifies the values from the source field included in this bucket category (in buckets of type PICKLIST and buckets of type TEXT).
     */
    global void setSourceDimensionValues(List sourceDimensionValues) { }

    /**
     * Returns a string.
     */
    global override virtual String toString() { return null; }
}