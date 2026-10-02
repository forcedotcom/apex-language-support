/**
 * Contains methods and constructors used to work with information about a cross filter.
 */
global class CrossFilter {
    /**
     * Creates an instance of the Reports.CrossFilter class. You can then set values by using the class’s set methods.
     */
    global Object CrossFilter() { return null; }

    /**
     * Creates an instance of the Reports.CrossFilter class using the specified parameters.
     */
    global Object CrossFilter(List criteria, Boolean includesObject, String primaryEntityField, String relatedEntity, String relatedEntityJoinField) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns information about how to filter the relatedEntity. Describes the subset of the relatedEntity which the primary entity is evaluated against.
     */
    global List getCriteria() { return null; }

    /**
     * Returns true if primary object has a relationship with the relatedEntity, otherwise returns false.
     */
    global Boolean getIncludesObject() { return false; }

    /**
     * Returns the name of the object on which the cross filter is evaluated.
     */
    global String getPrimaryEntityField() { return null; }

    /**
     * Returns name of the object that the primaryEntityField is evaluated against—the right-hand side of the cross filter.
     */
    global String getRelatedEntity() { return null; }

    /**
     * Returns the name of the field used to join the primaryEntityField and relatedEntity.
     */
    global String getRelatedEntityJoinField() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Specifis how to filter the relatedEntity. Relates the primary entity with a subset of the relatedEntity.
     */
    global void setCriteria(List criteria) { }

    /**
     * Specifies whether objects returned have a relationship with the relatedEntity (true) or not (false).
     */
    global void setIncludesObject(Boolean includesObject) { }

    /**
     * Specifies the name of the object on which the cross filter is evaluated.
     */
    global void setPrimaryEntityField(String primaryEntityField) { }

    /**
     * Specifies the name of the object that the primaryEntityField is evaluated against—the right-hand side of the cross filter.
     */
    global void setRelatedEntity(String relatedEntity) { }

    /**
     * Specifies the name of the field used to join the primaryEntityField and relatedEntity.
     */
    global void setRelatedEntityJoinField(String relatedEntityJoinField) { }

    /**
     * Returns a string.
     */
    global override virtual String toString() { return null; }
}