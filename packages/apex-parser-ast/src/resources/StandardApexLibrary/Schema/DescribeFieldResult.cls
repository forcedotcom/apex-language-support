/**
 * Contains methods for describing sObject fields.
 */
global class DescribeFieldResult {

  /**
   * For variable-length fields (including binary fields), returns the maximum size of the field, in bytes.
   * @return Integer
   */
  public Integer getByteLength() {}

  /**
   * Returns the formula specified for this field.
   * @return String
   */
  public String getCalculatedFormula() {}

  /**
   * Returns the token of the controlling field.
   * @return Schema.sObjectField
   */
  public Schema.sObjectField getController() {}

  /**
   * Returns the default value for this field.
   * @return Object
   */
  public Object getDefaultValue() {}

  /**
   * Returns the default formula value that is specified for this formula field.
   * @return String
   */
  public String getDefaultValueFormula() {}

  /**
   * Returns the maximum number of digits specified for the field. This method is only valid with Integer fields.
   * @return Integer
   */
  public Integer getDigits() {}

  /**
   * Returns the content of the field-level help.
   * @return String
   */
  public String getInlineHelpText() {}

  /**
   * Returns the text label that is displayed next to the field in the Salesforce user interface. This label can be localized.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the maximum size of the field for the DescribeFieldResult object in Unicode characters (not bytes).
   * @return Integer
   */
  public Integer getLength() {}

  /**
   * Returns the name of the field, similar to the getName method. However, if the field is part of the current namespace, the namespace portion of the name is omitted.
   * @return String
   */
  public String getLocalName() {}

  /**
   * Returns the field name used in Apex.
   * @return String
   */
  public String getName() {}

  /**
   * Returns a list of active PicklistEntry objects. A runtime error is returned if the field isn’t a picklist. Only active picklist values are returned.
   * @return List<Schema.PicklistEntry>
   */
  public List<Schema.PicklistEntry> getPicklistValues() {}

  /**
   * For fields of type Double, returns the maximum number of digits that can be stored, including all numbers to the left and to the right of the decimal point (but excluding the decimal point character).
   * @return Integer
   */
  public Integer getPrecision() {}

  /**
   * Returns the name of the custom field on the parent standard or custom object whose values are matched against the values of the child external object's indirect lookup relationship field. The match is done to determine which records are related to each other.
   * @return String
   */
  public String getReferenceTargetField() {}

  /**
   * Returns a list of Schema.sObjectType objects for the parent objects of this field. If the isNamePointing method returns true , there is more than one entry in the list, otherwise there is only one.
   * @return List <Schema.sObjectType>
   */
  public List <Schema.sObjectType> getReferenceTo() {}

  /**
   * Returns the name of the child-to-parent relationship.
   * @return String
   */
  public String getRelationshipName() {}

  /**
   * Returns 0 if the field is the primary relationship field or 1 if the field is the secondary relationship field.
   * @return Integer
   */
  public Integer getRelationshipOrder() {}

  /**
   * For fields of type Double, returns the number of digits to the right of the decimal point.
   * @return Integer
   */
  public Integer getScale() {}

  /**
   * Returns one of the SoapType enum values, depending on the type of field.
   * @return Schema.SOAPType
   */
  public Schema.SOAPType getSOAPType() {}

  /**
   * Returns the token for this field.
   * @return Schema.sObjectField
   */
  public Schema.sObjectField getSObjectField() {}

  public Schema.SObjectType getSObjectType() {}

  /**
   * Returns one of the DisplayType enum values, depending on the type of field.
   * @return Schema.DisplayType
   */
  public Schema.DisplayType getType() {}

  /**
   * Returns true if the current user can see this field, false otherwise.
   * @return Boolean
   */
  public Boolean isAccessible() {}

  /**
   * Returns true if the current field is enabled to display Einstein prediction data, false otherwise.
   * @return Boolean
   */
  public Boolean isAiPredictionField() {}

  /**
   * Returns true if the field is an Auto Number field, false otherwise.
   * @return Boolean
   */
  public Boolean isAutoNumber() {}

  /**
   * Returns true if the field is a custom formula field, false otherwise. Note that custom formula fields are always read-only.
   * @return Boolean
   */
  public Boolean isCalculated() {}

  /**
   * Returns true if the child object is deleted when the parent object is deleted, false otherwise.
   * @return Boolean
   */
  public Boolean isCascadeDelete() {}

  /**
   * Returns true if the field is case sensitive, false otherwise.
   * @return Boolean
   */
  public Boolean isCaseSensitive() {}

  /**
   * Returns true if the field can be created by the current user, false otherwise.
   * @return Boolean
   */
  public Boolean isCreateable() {}

  /**
   * Returns true if the field is a custom field, false if it is a standard field, such as Name .
   * @return Boolean
   */
  public Boolean isCustom() {}

  /**
   * Returns true if the field receives a default value when created, false otherwise.
   * @return Boolean
   */
  public Boolean isDefaultedOnCreate() {}

  /**
   * Returns true if the picklist is a dependent picklist, false otherwise.
   * @return Boolean
   */
  public Boolean isDependentPicklist() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  public Boolean isDeprecatedAndHidden() {}

  /**
   * Returns true if the field is encrypted with Shield Platform Encryption, false otherwise.
   * @return Boolean
   */
  public Boolean isEncrypted() {}

  /**
   * Returns true if the field is used as an external ID, false otherwise.
   * @return Boolean
   */
  public Boolean isExternalID() {}

  /**
   * Returns true if the field can be used as part of the filter criteria of a WHERE statement, false otherwise.
   * @return Boolean
   */
  public Boolean isFilterable() {}

  /**
   * Returns true if null is treated as zero in a formula field, false otherwise.
   * @return Boolean
   */
  public Boolean isFormulaTreatNullNumberAsZero() {}

  /**
   * Returns true if the field can be included in the GROUP BY clause of a SOQL query, false otherwise. This method is only available for Apex classes and triggers saved using API version 18.0 and higher.
   * @return Boolean
   */
  public Boolean isGroupable() {}

  /**
   * Returns true if the field has been formatted for HTML and should be encoded for display in HTML, false otherwise. One example of a field that returns true for this method is a hyperlink custom formula field. Another example is a custom formula field that has an IMAGE text function.
   * @return Boolean
   */
  public Boolean isHtmlFormatted() {}

  /**
   * Returns true if the field can be used to specify a record in an upsert method, false otherwise.
   * @return Boolean
   */
  public Boolean isIdLookup() {}

  /**
   * Returns true if the field is a name field, false otherwise.
   * @return Boolean
   */
  public Boolean isNameField() {}

  /**
   * Returns true if the field can have multiple types of objects as parents. For example, a task can have both the Contact/Lead ID ( WhoId ) field and the Opportunity/Account ID ( WhatId ) field return true for this method. because either of those objects can be the parent of a particular task record. This method returns false otherwise.
   * @return Boolean
   */
  public Boolean isNamePointing() {}

  /**
   * Returns true if the field is nillable, false otherwise. A nillable field can have empty content. A non-nillable field must have a value for the object to be created or saved.
   * @return Boolean
   */
  public Boolean isNillable() {}

  /**
   * Returns true if field permissions can be specified for the field, false otherwise.
   * @return Boolean
   */
  public Boolean isPermissionable() {}

  /**
   * Returns true if the parent object can't be deleted because it is referenced by a child object, false otherwise.
   * @return Boolean
   */
  public Boolean isRestrictedDelete() {}

  /**
   * Returns true if the field is a restricted picklist, false otherwise
   * @return Boolean
   */
  public Boolean isRestrictedPicklist() {}

  /**
   * Returns true if a foreign key can be included in prefiltering when used in a SOSL WHERE clause, false otherwise.
   * @return Boolean
   */
  public Boolean isSearchPrefilterable() {}

  /**
   * Returns true if a query can sort on the field, false otherwise
   * @return Boolean
   */
  public Boolean isSortable() {}

  /**
   * Returns true if the value for the field must be unique, false otherwise
   * @return Boolean
   */
  public Boolean isUnique() {}

  /**
   * Returns true if the field can be edited by the current user, or child records in a master-detail relationship field on a custom object can be reparented to different parent records; false otherwise.
   * @return Boolean
   */
  public Boolean isUpdateable() {}

  /**
   * Returns true if writing to the detail object requires read sharing instead of read/write sharing of the parent.
   * @return Boolean
   */
  public Boolean isWriteRequiresMasterRead() {}

}