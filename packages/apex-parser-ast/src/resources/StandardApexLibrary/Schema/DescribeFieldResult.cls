/**
 * Contains methods for describing sObject fields.
 * <p>Usage
 * Instances of field describe results on the same DescribeFieldResult aren’t guaranteed to be equal because the state and behavior of a describe object is determined by various factors including the API version used. To compare describe results, call the getSObjectField() method on the field describe results and use the equality operator (==) to compare the SObjectField values.
 * <p>Example
 * The following is an example of how to instantiate a field describe result object:
 * Schema.DescribeFieldResult dfr = Account.Description.getDescribe();
 */
global class DescribeFieldResult {
    global Boolean accessible { get; }
    global Boolean aggregatable { get; }
    global Boolean aipredictionfield { get; }
    global Boolean autonumber { get; }
    global Integer bytelength { get; }
    global Boolean calculated { get; }
    global String calculatedformula { get; }
    global Boolean cascadedelete { get; }
    global Boolean casesensitive { get; }
    global String compoundfieldname { get; }
    global Schema.SObjectField controller { get; }
    global Boolean createable { get; }
    global Boolean custom { get; }
    global Boolean datatranslationenabled { get; }
    global Boolean defaultedoncreate { get; }
    global Object defaultvalue { get; }
    global String defaultvalueformula { get; }
    global Boolean dependentpicklist { get; }
    global Boolean deprecatedandhidden { get; }
    global Integer digits { get; }
    global Boolean displaylocationindecimal { get; }
    global Boolean encrypted { get; }
    global Boolean externalid { get; }
    global Boolean filterable { get; }
    global Schema.FilteredLookupInfo filteredlookupinfo { get; }
    global Boolean formulatreatnullnumberaszero { get; }
    global Boolean groupable { get; }
    global Boolean highscalenumber { get; }
    global Boolean htmlformatted { get; }
    global Boolean idlookup { get; }
    global String inlinehelptext { get; }
    global String label { get; }
    global Integer length { get; }
    global String localname { get; }
    global String mask { get; }
    global String masktype { get; }
    global String name { get; }
    global Boolean namefield { get; }
    global Boolean namepointing { get; }
    global Boolean nillable { get; }
    global Boolean permissionable { get; }
    global List picklistvalues { get; }
    global Integer precision { get; }
    global Boolean querybydistance { get; }
    global String referencetargetfield { get; }
    global List referenceto { get; }
    global String relationshipname { get; }
    global Integer relationshiporder { get; }
    global Boolean restricteddelete { get; }
    global Boolean restrictedpicklist { get; }
    global Integer scale { get; }
    global Boolean searchprefilterable { get; }
    global Schema.SoapType soaptype { get; }
    global Schema.SObjectField sobjectfield { get; }
    global Schema.SObjectType sobjecttype { get; }
    global Boolean sortable { get; }
    global Schema.DisplayType type { get; }
    global Boolean unique { get; }
    global Boolean updateable { get; }
    global Boolean writerequiresmasterread { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * For variable-length fields (including binary fields), returns the maximum size of the field, in bytes.
     */
    global Integer getByteLength() { return 0; }

    /**
     * Returns the formula specified for this field.
     */
    global String getCalculatedFormula() { return null; }

    global String getCompoundFieldName() { return null; }

    /**
     * Returns the token of the controlling field.
     */
    global Schema.SObjectField getController() { return null; }

    global Boolean getDataTranslationEnabled() { return false; }

    /**
     * Returns the default value for this field.
     */
    global Object getDefaultValue() { return null; }

    /**
     * Returns the default formula value that is specified for this formula field.
     */
    global String getDefaultValueFormula() { return null; }

    /**
     * Returns the maximum number of digits specified for the field. This method is only valid with Integer fields.
     */
    global Integer getDigits() { return 0; }

    global Schema.FilteredLookupInfo getFilteredLookupInfo() { return null; }

    /**
     * Returns the content of the field-level help.
     * <p>Usage
     * For more information, see “Define Field-Level Help” in the Salesforce online help.
     */
    global String getInlineHelpText() { return null; }

    /**
     * Returns the text label that is displayed next to the field in the Salesforce user interface. This label can be localized.
     * <p>Usage
     * Note
     * For the Type field on standard objects, getLabel returns a label different from the default label. It returns a label of the form Object Type, where Object is the standard object label. For example, for the Type field on Account, getLabel returns Account Type instead of the default label Type. If the Type label is renamed, getLabel returns the new label. You can check or change the labels of all standard object fields from Setup by entering Rename Tabs and Labels in the Quick Find box, then selecting Rename Tabs and Labels.
     */
    global String getLabel() { return null; }

    /**
     * Returns the maximum size of the field for the DescribeFieldResult object in Unicode characters (not bytes).
     */
    global Integer getLength() { return 0; }

    /**
     * Returns the name of the field, similar to the getName method. However, if the field is part of the current namespace, the namespace portion of the name is omitted.
     */
    global String getLocalName() { return null; }

    global String getMask() { return null; }

    global String getMaskType() { return null; }

    /**
     * Returns the field name used in Apex.
     */
    global String getName() { return null; }

    /**
     * Returns a list of active PicklistEntry objects. A runtime error is returned if the field isn’t a picklist. Only active picklist values are returned.
     */
    global List getPicklistValues() { return null; }

    /**
     * For fields of type Double, returns the maximum number of digits that can be stored, including all numbers to the left and to the right of the decimal point (but excluding the decimal point character).
     */
    global Integer getPrecision() { return 0; }

    /**
     * Returns the name of the custom field on the parent standard or custom object whose values are matched against the values of the child external object's indirect lookup relationship field. The match is done to determine which records are related to each other.
     * <p>Usage
     * For information about indirect lookup relationships, see “Indirect Lookup Relationship Fields on External Objects” in the Salesforce Help.
     */
    global String getReferenceTargetField() { return null; }

    /**
     * Returns a list of Schema.sObjectType objects for the parent objects of this field. If the isNamePointing method returns true, there is more than one entry in the list, otherwise there is only one.
     * <p>Versioned Behavior Changes
     * In API version 51.0 and later, the getReferenceTo() method returns referenced objects that aren’t accessible to the context user. If the context user has access to an object’s field that references another object, irrespective of the context user’s access to the cross-referenced object, the method returns references. In API version 50.0 and earlier, if the context user doesn’t have access to the cross-referenced object, the method returns an empty list.
     */
    global List getReferenceTo() { return null; }

    /**
     * Returns the name of the child-to-parent relationship.
     * <p>Usage
     * For more information about relationships and relationship names, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_relationships_understanding.htm" target="_blank" title="HTML (New Window)">Understanding Relationship Names</a> in the SOQL and SOSL Reference.
     */
    global String getRelationshipName() { return null; }

    /**
     * Returns 0 if the field is the primary relationship field or 1 if the field is the secondary relationship field.
     * <p>Usage
     * For more information about primary and secondary relationships, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=sf.relationships_considerations.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Considerations for Object Relationships</a>. For more information about relationships and relationship names, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_relationships_understanding.htm" target="_blank" title="HTML (New Window)">Understanding Relationship Names</a> in the SOQL and SOSL Reference.
     */
    global Integer getRelationshipOrder() { return 0; }

    /**
     * Returns the Salesforce object type from which this field originates.
     * <p>Example
     * Schema.DescribeFieldResult f = Account.Industry.getDescribe();
     * Schema.sObjectType sourceType = f.getSObjectType();
     * Assert.areEqual(Account.sObjectType, sourceType);
     */
    global Schema.SObjectType getSObjectType() { return null; }

    /**
     * For fields of type Double, returns the number of digits to the right of the decimal point.
     */
    global Integer getScale() { return 0; }

    /**
     * Returns one of the SoapType enum values, depending on the type of field.
     */
    global Schema.SoapType getSoapType() { return null; }

    /**
     * Returns the token for this field.
     */
    global Schema.SObjectField getSobjectField() { return null; }

    /**
     * Returns one of the DisplayType enum values, depending on the type of field.
     */
    global Schema.DisplayType getType() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if the current user can see this field, false otherwise.
     */
    global Boolean isAccessible() { return false; }

    global Boolean isAggregatable() { return false; }

    /**
     * Returns true if the current field is enabled to display Einstein prediction data, false otherwise.
     * <p>Usage
     * <p>Custom number fields can be set to display Einstein prediction values. If you are participating in the Einstein Prediction Builder Beta program, use Einstein Prediction Builder to set up the value to display. Use this method to find out if a field is enabled to display an Einstein prediction value.
     */
    global Boolean isAiPredictionField() { return false; }

    /**
     * Returns true if the field is an Auto Number field, false otherwise.
     * <p>Usage
     * Analogous to a SQL IDENTITY type, Auto Number fields are read-only, non-createable text fields with a maximum length of 30 characters. Auto Number fields are used to provide a unique ID that is independent of the internal object ID (such as a purchase order number or invoice number). Auto Number fields are configured entirely in the Salesforce user interface.
     */
    global Boolean isAutoNumber() { return false; }

    /**
     * Returns true if the field is a custom formula field, false otherwise. Note that custom formula fields are always read-only.
     */
    global Boolean isCalculated() { return false; }

    /**
     * Returns true if the child object is deleted when the parent object is deleted, false otherwise.
     */
    global Boolean isCascadeDelete() { return false; }

    /**
     * Returns true if the field is case sensitive, false otherwise.
     */
    global Boolean isCaseSensitive() { return false; }

    /**
     * Returns true if the field can be created by the current user, false otherwise.
     */
    global Boolean isCreateable() { return false; }

    /**
     * Returns true if the field is a custom field, false if it is a standard field, such as Name.
     */
    global Boolean isCustom() { return false; }

    /**
     * Returns true if the field receives a default value when created, false otherwise.
     * <p>Usage
     * If this method returns true, Salesforce implicitly assigns a value for this field when the object is created, even if a value for this field is not passed in on the create call. For example, in the Opportunity object, the Probability field has this attribute because its value is derived from the Stage field. Similarly, the Owner has this attribute on most objects because its value is derived from the current user (if the Owner field is not specified).
     */
    global Boolean isDefaultedOnCreate() { return false; }

    /**
     * Returns true if the picklist is a dependent picklist, false otherwise.
     */
    global Boolean isDependentPicklist() { return false; }

    /**
     * Reserved for future use.
     */
    global Boolean isDeprecatedAndHidden() { return false; }

    global Boolean isDisplayLocationInDecimal() { return false; }

    /**
     * Returns true if the field is encrypted with Shield Platform Encryption, false otherwise.
     */
    global Boolean isEncrypted() { return false; }

    /**
     * Returns true if the field is used as an external ID, false otherwise.
     */
    global Boolean isExternalId() { return false; }

    /**
     * Returns true if the field can be used as part of the filter criteria of a WHERE statement, false otherwise.
     */
    global Boolean isFilterable() { return false; }

    /**
     * Returns true if null is treated as zero in a formula field, false otherwise.
     */
    global Boolean isFormulaTreatNullNumberAsZero() { return false; }

    /**
     * Returns true if the field can be included in the GROUP BY clause of a SOQL query, false otherwise. This method is only available for Apex classes and triggers saved using API version 18.0 and higher.
     */
    global Boolean isGroupable() { return false; }

    global Boolean isHighScaleNumber() { return false; }

    /**
     * Returns true if the field has been formatted for HTML and should be encoded for display in HTML, false otherwise. One example of a field that returns true for this method is a hyperlink custom formula field. Another example is a custom formula field that has an IMAGE text function.
     */
    global Boolean isHtmlFormatted() { return false; }

    /**
     * Returns true if the field can be used to specify a record in an upsert method, false otherwise.
     */
    global Boolean isIdLookup() { return false; }

    /**
     * Returns true if the field is a name field, false otherwise.
     * <p>Usage
     * This method is used to identify the name field for standard objects (such as AccountName for an Account object) and custom objects. Objects can only have one name field, except where the FirstName and LastName fields are used instead (such as on the Contact object).
     * If a compound name is present, for example, the Name field on a person account, isNameField is set to true for that record.
     */
    global Boolean isNameField() { return false; }

    /**
     * Returns true if the field can have multiple types of objects as parents. For example, a task can have both the Contact/Lead ID (WhoId) field and the Opportunity/Account ID (WhatId) field return true for this method. because either of those objects can be the parent of a particular task record. This method returns false otherwise.
     */
    global Boolean isNamePointing() { return false; }

    /**
     * Returns true if the field is nillable, false otherwise. A nillable field can have empty content. A non-nillable field must have a value for the object to be created or saved.
     */
    global Boolean isNillable() { return false; }

    /**
     * Returns true if field permissions can be specified for the field, false otherwise.
     */
    global Boolean isPermissionable() { return false; }

    global Boolean isQueryByDistance() { return false; }

    /**
     * Returns true if the parent object can't be deleted because it is referenced by a child object, false otherwise.
     */
    global Boolean isRestrictedDelete() { return false; }

    /**
     * Returns true if the field is a restricted picklist, false otherwise
     */
    global Boolean isRestrictedPicklist() { return false; }

    /**
     * Returns true if a foreign key can be included in prefiltering when used in a SOSL WHERE clause, false otherwise.
     * <p>Usage
     * Prefiltering means to filter by a specific field value before executing the full search query. Prefiltering is supported only in WHERE clauses with the equals (=) operator.
     */
    global Boolean isSearchPrefilterable() { return false; }

    /**
     * Returns true if a query can sort on the field, false otherwise
     */
    global Boolean isSortable() { return false; }

    /**
     * Returns true if the value for the field must be unique, false otherwise
     */
    global Boolean isUnique() { return false; }

    /**
     * Returns true if the field can be edited by the current user, or child records in a master-detail relationship field on a custom object can be reparented to different parent records; false otherwise.
     * <p>Important
     * Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.
     */
    global Boolean isUpdateable() { return false; }

    /**
     * Returns true if writing to the detail object requires read sharing instead of read/write sharing of the parent.
     */
    global Boolean isWriteRequiresMasterRead() { return false; }

    global String toString() { return null; }
}