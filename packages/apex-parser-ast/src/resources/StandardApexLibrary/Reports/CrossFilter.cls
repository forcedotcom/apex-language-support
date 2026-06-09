/**
 * Contains methods and constructors used to work with information about a cross filter.
 */
global class CrossFilter {

  global CrossFilter(List<Reports.ReportFilter> criteria, Boolean includesObject, String primaryEntityField, String relatedEntity, String relatedEntityJoinField) {}

  /**
   * Returns information about how to filter the relatedEntity . Describes the subset of the relatedEntity which the primary entity is evaluated against.
   * @return List<Reports.ReportFilter>
   */
  global List<Reports.ReportFilter> getCriteria() {}

  /**
   * Returns true if primary object has a relationship with the relatedEntity , otherwise returns false .
   * @return Boolean
   */
  global Boolean getIncludesObject() {}

  /**
   * Returns the name of the object on which the cross filter is evaluated.
   * @return String
   */
  global String getPrimaryEntityField() {}

  /**
   * Returns name of the object that the primaryEntityField is evaluated against—the right-hand side of the cross filter.
   * @return String
   */
  global String getRelatedEntity() {}

  /**
   * Returns the name of the field used to join the primaryEntityField and relatedEntity .
   * @return String
   */
  global String getRelatedEntityJoinField() {}

  /**
   * Specifis how to filter the relatedEntity . Relates the primary entity with a subset of the relatedEntity .
   * @param criteria 
   */
  global void setCriteria(List<Reports.ReportFilter> criteria) {}

  /**
   * Specifies whether objects returned have a relationship with the relatedEntity ( true ) or not ( false ).
   * @param includesObject 
   */
  global void setIncludesObject(Boolean includesObject) {}

  /**
   * Specifies the name of the object on which the cross filter is evaluated.
   * @param primaryEntityField 
   */
  global void setPrimaryEntityField(String primaryEntityField) {}

  /**
   * Specifies the name of the object that the primaryEntityField is evaluated against—the right-hand side of the cross filter.
   * @param relatedEntity 
   */
  global void setRelatedEntity(String relatedEntity) {}

  /**
   * Specifies the name of the field used to join the primaryEntityField and relatedEntity .
   * @param relatedEntityJoinField 
   */
  global void setRelatedEntityJoinField(String relatedEntityJoinField) {}

  /**
   * Returns a string.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}