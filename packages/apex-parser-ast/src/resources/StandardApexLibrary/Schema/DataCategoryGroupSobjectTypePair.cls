/**
 * Specifies a category group and an associated object.
 * <p>Usage
 * Schema.DataCategoryGroupSobjectTypePair is used by the describeDataCategory GroupStructures method to return the categories available to this object.
 */
global class DataCategoryGroupSobjectTypePair {
    global String datacategorygroupname { get; set; }
    global String sobject { get; set; }

    /**
     * Creates a new instance of the Schema.DataCategoryGroupSobjectTypePair class.
     */
    global DataCategoryGroupSobjectTypePair() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the unique name used by the API to access the data category group.
     */
    global String getDataCategoryGroupName() { return null; }

    /**
     * Returns the object name associated with the data category group.
     */
    global String getSobject() { return null; }

    global Integer hashCode() { return 0; }

    global void setDataCategoryGroupName(String param1) { }

    /**
     * Sets the sObject associated with the data category group.
     */
    global void setSobject(String param1) { }

    global String toString() { return null; }
}