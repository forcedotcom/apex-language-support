/**
 * Contains methods for describing SObjects. None of the methods take an argument.
 */
global class DescribeSObjectResult {

  public Boolean equals(Object obj) {}

  public String getAssociateParentEntity() {}

  /**
   * Returns a list of child relationships, which are the names of the sObjects that have a foreign key to the sObject being described.
   * @return Schema.ChildRelationship
   */
  public Schema.ChildRelationship getChildRelationships() {}

  public Boolean getDataTranslationEnabled() {}

  /**
   * Reserved for future use.
   * @return String
   */
  public String getDefaultImplementation() {}

  public Schema.SObjectTypeFields getFields() {}

  public Schema.SObjectTypeFieldSets getFieldSets() {}

  /**
   * Reserved for future use.
   * @return String
   */
  public String getImplementedBy() {}

  /**
   * Reserved for future use.
   * @return String
   */
  public String getImplementsInterfaces() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  public Boolean getIsInterface() {}

  /**
   * Returns the three-character prefix code for the object. Record IDs are prefixed with three-character codes that specify the type of the object (for example, accounts have a prefix of 001 and opportunities have a prefix of 006 ).
   * @return String
   */
  public String getKeyPrefix() {}

  /**
   * Returns the object's label, which may or may not match the object name.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the object's plural label, which may or may not match the object name.
   * @return String
   */
  public String getLabelPlural() {}

  /**
   * Returns the name of the object, similar to the getName method. However, if the object is part of the current namespace, the namespace portion of the name is omitted.
   * @return String
   */
  public String getLocalName() {}

  /**
   * Returns the name of the object.
   * @return String
   */
  public String getName() {}

  /**
   * Returns a list of the record types supported by this object. The current user is not required to have access to a record type to see it in this list.
   * @return List<Schema.RecordTypeInfo>
   */
  public List<Schema.RecordTypeInfo> getRecordTypeInfos() {}

  /**
   * Returns a map that matches developer names to their associated record type. The current user is not required to have access to a record type to see it in this map.
   * @return Map< String , Schema.RecordTypeInfo>
   */
  public Map< String , Schema.RecordTypeInfo> getRecordTypeInfosByDeveloperName() {}

  /**
   * Returns a map that matches record IDs to their associated record types. The current user is not required to have access to a record type to see it in this map.
   * @return Schema.RecordTypeInfo
   */
  public Schema.RecordTypeInfo getRecordTypeInfosById() {}

  /**
   * Returns a map that matches record labels to their associated record type. The current user is not required to have access to a record type to see it in this map.
   * @return Schema.RecordTypeInfo
   */
  public Schema.RecordTypeInfo getRecordTypeInfosByName() {}

  /**
   * Returns the effective describe option used by the system for the SObject.
   * @return Schema.SObjectDescribeOptions
   */
  public Schema.SObjectDescribeOptions getSObjectDescribeOption() {}

  /**
   * Returns the Schema.SObjectType object for the sObject. You can use this to create a similar sObject.
   * @return Schema.SObjectType
   */
  public Schema.SObjectType getSobjectType() {}

  public Integer hashCode() {}

  /**
   * Returns true if the current user can see this object, false otherwise.
   * @return Boolean
   */
  public Boolean isAccessible() {}

  /**
   * Returns true if the object can be created by the current user, false otherwise.
   * @return Boolean
   */
  public Boolean isCreateable() {}

  /**
   * Returns true if the object is a custom object, false if it is a standard object.
   * @return Boolean
   */
  public Boolean isCustom() {}

  /**
   * Returns true if the object is a custom setting, false otherwise.
   * @return Boolean
   */
  public Boolean isCustomSetting() {}

  /**
   * Returns true if the object can be deleted by the current user, false otherwise.
   * @return Boolean
   */
  public Boolean isDeletable() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  public Boolean isDeprecatedAndHidden() {}

  /**
   * Returns true if Chatter feeds are enabled for the object, false otherwise. This method is only available for Apex classes and triggers saved using SalesforceAPI version 19.0 and later.
   * @return Boolean
   */
  public Boolean isFeedEnabled() {}

  /**
   * Returns true if the object can be merged with other objects of its type by the current user, false otherwise. true is returned for leads, contacts, and accounts.
   * @return Boolean
   */
  public Boolean isMergeable() {}

  /**
   * Returns true if Most Recently Used (MRU) list functionality is enabled for the object, false otherwise.
   * @return Boolean
   */
  public Boolean isMruEnabled() {}

  /**
   * Returns true if the object can be queried by the current user, false otherwise
   * @return Boolean
   */
  public Boolean isQueryable() {}

  /**
   * Returns true if the object can be searched by the current user, false otherwise.
   * @return Boolean
   */
  public Boolean isSearchable() {}

  /**
   * Returns true if the object can be undeleted by the current user, false otherwise.
   * @return Boolean
   */
  public Boolean isUndeletable() {}

  /**
   * Returns true if the object can be updated by the current user, false otherwise.
   * @return Boolean
   */
  public Boolean isUpdateable() {}

  public String toString() {}

}