/**
 * Contains methods and constructors used to work with information about a cross filter.
 */
global class CrossFilter {

  /**
   * Returns information about how to filter the relatedEntity . Describes the subset of the relatedEntity which the primary entity is evaluated against.
   * @return List<Reports.ReportFilter>
   */
  public List<Reports.ReportFilter> getCriteria() {}

  /**
   * Returns true if primary object has a relationship with the relatedEntity , otherwise returns false .
   * @return Boolean
   */
  public Boolean getIncludesObject() {}

  /**
   * Returns the name of the object on which the cross filter is evaluated.
   * @return String
   */
  public String getPrimaryEntityField() {}

  /**
   * Returns name of the object that the primaryEntityField is evaluated against—the right-hand side of the cross filter.
   * @return String
   */
  public String getRelatedEntity() {}

  /**
   * Returns the name of the field used to join the primaryEntityField and relatedEntity .
   * @return String
   */
  public String getRelatedEntityJoinField() {}

  /**
   * Specifis how to filter the relatedEntity . Relates the primary entity with a subset of the relatedEntity .
   * @param criteria 
   */
  public void setCriteria(List<Reports.ReportFilter> criteria) {}

  /**
   * Specifies whether objects returned have a relationship with the relatedEntity ( true ) or not ( false ).
   * @param includesObject 
   */
  public void setIncludesObject(Boolean includesObject) {}

  /**
   * Specifies the name of the object on which the cross filter is evaluated.
   * @param primaryEntityField 
   */
  public void setPrimaryEntityField(String primaryEntityField) {}

  /**
   * Specifies the name of the object that the primaryEntityField is evaluated against—the right-hand side of the cross filter.
   * @param relatedEntity 
   */
  public void setRelatedEntity(String relatedEntity) {}

  /**
   * Specifies the name of the field used to join the primaryEntityField and relatedEntity .
   * @param relatedEntityJoinField 
   */
  public void setRelatedEntityJoinField(String relatedEntityJoinField) {}

  /**
   * Returns a string.
   * @return String
   */
  public String toString() {}

}