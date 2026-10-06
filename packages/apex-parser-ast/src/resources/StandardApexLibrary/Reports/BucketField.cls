/**
 * Contains methods and constructors to work with information about a bucket field, including bucket type, name, and bucketed values.
 */
global class BucketField {
    /**
     * Creates an instance of the Reports.BucketField class. You can then set values by using the class’s set methods.
     */
    global BucketField() { }

    /**
     * Creates an instance of the Reports.BucketField class using the specified parameters.
     */
    global BucketField(reports.BucketType bucketType, String devloperName, String label, Boolean nullTreatedAsZero, String otherBucketLabel, String sourceColumnName, List values) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the bucket type.
     */
    global reports.BucketType getBucketType() { return null; }

    /**
     * Returns the bucket’s API name.
     */
    global String getDevloperName() { return null; }

    /**
     * Returns the user-facing name of the bucket.
     */
    global String getLabel() { return null; }

    /**
     * Returns true if null values are converted to the number zero, otherwise returns false.
     */
    global Boolean getNullTreatedAsZero() { return false; }

    /**
     * Returns the name of fields grouped as Other in buckets of type PICKLIST.
     */
    global String getOtherBucketLabel() { return null; }

    /**
     * Returns the API name of the bucketed field.
     */
    global String getSourceColumnName() { return null; }

    /**
     * Returns the report values grouped by the bucket field.
     */
    global List getValues() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the BucketType of the bucket.
     */
    global void setBucketType(reports.BucketType bucketType) { }

    /**
     * Sets the BucketType of the bucket.
     */
    global void setBucketType(String value) { }

    /**
     * Sets the API name of the bucket.
     */
    global void setDevloperName(String devloperName) { }

    /**
     * Sets the user-facing name of the bucket.
     */
    global void setLabel(String label) { }

    /**
     * Specifies whether null values in the bucket are converted to zero (true) or not (false).
     */
    global void setNullTreatedAsZero(Boolean nullTreatedAsZero) { }

    /**
     * Sets the name of the fields grouped as Other (in buckets of BucketType PICKLIST).
     */
    global void setOtherBucketLabel(String otherBucketLabel) { }

    /**
     * Specifies the name of the bucketed field.
     */
    global void setSourceColumnName(String sourceColumnName) { }

    /**
     * Specifies which type of values are included in the bucket.
     */
    global void setValues(List values) { }

    /**
     * Returns a string.
     */
    global override virtual String toString() { return null; }
}