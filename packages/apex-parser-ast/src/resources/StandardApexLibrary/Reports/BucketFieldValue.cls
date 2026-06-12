/**
 * Contains information about the report values included in a bucket field.
 */
global class BucketFieldValue {

  global BucketFieldValue(String label, List<String> sourceDimensionValues, Double rangeUpperBound) {}

  /**
   * Returns the user-facing name of the bucket category.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the greatest range limit under which values are included in this bucket category (in buckets of type NUMBER ).
   * @return Double
   */
  global Double getRangeUpperBound() {}

  /**
   * Returns a list of the values from the source field included in this bucket category (in buckets of type PICKLIST and buckets of type TEXT ).
   * @return List<String>
   */
  global List<String> getSourceDimensionValues() {}

  /**
   * Set the user-facing name of the bucket category.
   * @param label 
   */
  global void setLabel(String label) {}

  /**
   * Sets the greatest limit of a range under which values are included in this bucket category (in buckets of type NUMBER ).
   * @param rangeUpperBound 
   */
  global void setRangeUpperBound(Double rangeUpperBound) {}

  /**
   * Specifies the values from the source field included in this bucket category (in buckets of type PICKLIST and buckets of type TEXT ).
   * @param sourceDimensionValues 
   */
  global void setSourceDimensionValues(List<String> sourceDimensionValues) {}

  /**
   * Returns a string.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}