/**
 * Contains methods and constructors to work with information about a bucket field, including bucket type, name, and bucketed values.
 */
global class BucketField {

  public BucketField(Reports.BucketType bucketType, String devloperName, String label, Boolean nullTreatedAsZero, String otherBucketLabel, String sourceColumnName, List<Reports.BucketFieldValue> values) {}

  /**
   * Returns the bucket type.
   * @return Reports.BucketType
   */
  public Reports.BucketType getBucketType() {}

  /**
   * Returns the bucket’s API name.
   * @return String
   */
  public String getDevloperName() {}

  /**
   * Returns the user-facing name of the bucket.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns true if null values are converted to the number zero, otherwise returns false .
   * @return Boolean
   */
  public Boolean getNullTreatedAsZero() {}

  /**
   * Returns the name of fields grouped as Other in buckets of type PICKLIST .
   * @return String
   */
  public String getOtherBucketLabel() {}

  /**
   * Returns the API name of the bucketed field.
   * @return String
   */
  public String getSourceColumnName() {}

  /**
   * Returns the report values grouped by the bucket field.
   * @return List<Reports.BucketFieldValue>
   */
  public List<Reports.BucketFieldValue> getValues() {}

  /**
   * Sets the BucketType of the bucket.
   * @param value See the Reports.BucketType enum for valid values.
   */
  public void setBucketType(String value) {}

  /**
   * Sets the BucketType of the bucket.
   * @param bucketType 
   */
  public void setBucketType(Reports.BucketType bucketType) {}

  /**
   * Sets the API name of the bucket.
   * @param devloperName The API name to assign to the bucket.
   */
  public void setDevloperName(String devloperName) {}

  /**
   * Sets the user-facing name of the bucket.
   * @param label 
   */
  public void setLabel(String label) {}

  /**
   * Specifies whether null values in the bucket are converted to zero ( true ) or not ( false ).
   * @param nullTreatedAsZero 
   */
  public void setNullTreatedAsZero(Boolean nullTreatedAsZero) {}

  /**
   * Sets the name of the fields grouped as Other (in buckets of BucketType PICKLIST ).
   * @param otherBucketLabel 
   */
  public void setOtherBucketLabel(String otherBucketLabel) {}

  /**
   * Specifies the name of the bucketed field.
   * @param sourceColumnName 
   */
  public void setSourceColumnName(String sourceColumnName) {}

  /**
   * Specifies which type of values are included in the bucket.
   * @param values 
   */
  public void setValues(List<Reports.BucketFieldValue> values) {}

  /**
   * Returns a string.
   * @return String
   */
  public String toString() {}

}