/**
 * Contains methods and constructors to work with information about a bucket field, including bucket type, name, and bucketed values.
 */
global class BucketField {

  global BucketField(Reports.BucketType bucketType, String devloperName, String label, Boolean nullTreatedAsZero, String otherBucketLabel, String sourceColumnName, List<Reports.BucketFieldValue> values) {}

  /**
   * Returns the bucket type.
   * @return Reports.BucketType
   */
  global Reports.BucketType getBucketType() {}

  /**
   * Returns the bucket’s API name.
   * @return String
   */
  global String getDevloperName() {}

  /**
   * Returns the user-facing name of the bucket.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns true if null values are converted to the number zero, otherwise returns false .
   * @return Boolean
   */
  global Boolean getNullTreatedAsZero() {}

  /**
   * Returns the name of fields grouped as Other in buckets of type PICKLIST .
   * @return String
   */
  global String getOtherBucketLabel() {}

  /**
   * Returns the API name of the bucketed field.
   * @return String
   */
  global String getSourceColumnName() {}

  /**
   * Returns the report values grouped by the bucket field.
   * @return List<Reports.BucketFieldValue>
   */
  global List<Reports.BucketFieldValue> getValues() {}

  /**
   * Sets the BucketType of the bucket.
   * @param value See the Reports.BucketType enum for valid values.
   */
  global void setBucketType(String value) {}

  /**
   * Sets the BucketType of the bucket.
   * @param bucketType 
   */
  global void setBucketType(Reports.BucketType bucketType) {}

  /**
   * Sets the API name of the bucket.
   * @param devloperName The API name to assign to the bucket.
   */
  global void setDevloperName(String devloperName) {}

  /**
   * Sets the user-facing name of the bucket.
   * @param label 
   */
  global void setLabel(String label) {}

  /**
   * Specifies whether null values in the bucket are converted to zero ( true ) or not ( false ).
   * @param nullTreatedAsZero 
   */
  global void setNullTreatedAsZero(Boolean nullTreatedAsZero) {}

  /**
   * Sets the name of the fields grouped as Other (in buckets of BucketType PICKLIST ).
   * @param otherBucketLabel 
   */
  global void setOtherBucketLabel(String otherBucketLabel) {}

  /**
   * Specifies the name of the bucketed field.
   * @param sourceColumnName 
   */
  global void setSourceColumnName(String sourceColumnName) {}

  /**
   * Specifies which type of values are included in the bucket.
   * @param values 
   */
  global void setValues(List<Reports.BucketFieldValue> values) {}

  /**
   * Returns a string.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}