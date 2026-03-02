/**
 * Contains information about the report values included in a bucket field.
 */
public class BucketFieldValue {

  /**
   * Returns the user-facing name of the bucket category.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the greatest range limit under which values are included in this bucket category (in buckets of type NUMBER ).
   * @return Double
   */
  public Double getRangeUpperBound() {}

  /**
   * Returns a list of the values from the source field included in this bucket category (in buckets of type PICKLIST and buckets of type TEXT ).
   * @return List< String >
   */
  public List< String > getSourceDimensionValues() {}

  /**
   * Set the user-facing name of the bucket category.
   * @param label 
   */
  public void setLabel(String label) {}

  /**
   * Sets the greatest limit of a range under which values are included in this bucket category (in buckets of type NUMBER ).
   * @param rangeUpperBound 
   */
  public void setRangeUpperBound(Double rangeUpperBound) {}

  /**
   * Specifies the values from the source field included in this bucket category (in buckets of type PICKLIST and buckets of type TEXT ).
   * @param sourceDimensionValues 
   */
  public void setSourceDimensionValues(List< String > sourceDimensionValues) {}

  /**
   * Returns a string.
   * @return String
   */
  public String toString() {}

}