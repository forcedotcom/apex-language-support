/**
 * Contains methods for describing SObjects. None of the methods take an argument.
 */
global class DescribeSObjectResult {

  global DescribeSObjectResult() {}

  global Boolean accessible;

  global String associateentitytype;

  global String associateparententity;

  global List<Schema.ChildRelationship> childrelationships;

  global Boolean createable;

  global Boolean custom;

  global Boolean customsetting;

  global Boolean datatranslationenabled;

  global String defaultimplementation;

  global Boolean deletable;

  global Boolean deprecatedandhidden;

  global Boolean feedenabled;

  global Schema.SObjectTypeFields fields;

  global Schema.SObjectTypeFieldSets fieldsets;

  global Boolean hassubtypes;

  global String implementedby;

  global String implementsinterfaces;

  global Boolean isinterface;

  global String keyprefix;

  global String label;

  global String labelplural;

  global String localname;

  global Boolean mergeable;

  global Boolean mruenabled;

  global String name;

  global Boolean queryable;

  global List<Schema.RecordTypeInfo> recordtypeinfos;

  global Map<String,Schema.RecordTypeInfo> recordtypeinfosbydevelopername;

  global Map<Id,Schema.RecordTypeInfo> recordtypeinfosbyid;

  global Map<String,Schema.RecordTypeInfo> recordtypeinfosbyname;

  global Boolean searchable;

  global Schema.SObjectDescribeOptions sobjectdescribeoption;

  global Schema.SObjectType sobjecttype;

  global Boolean undeletable;

  global Boolean updateable;

  global Boolean equals(Object obj) {}

  global String getAssociateParentEntity() {}

  /**
   * Returns a list of child relationships, which are the names of the sObjects that have a foreign key to the sObject being described.
   * @return Schema.ChildRelationship
   */
  global Schema.ChildRelationship getChildRelationships() {}

  global Boolean getDataTranslationEnabled() {}

  /**
   * Reserved for future use.
   * @return String
   */
  global String getDefaultImplementation() {}

  global Schema.SObjectTypeFields getFields() {}

  global Schema.SObjectTypeFieldSets getFieldSets() {}

  /**
   * Reserved for future use.
   * @return String
   */
  global String getImplementedBy() {}

  /**
   * Reserved for future use.
   * @return String
   */
  global String getImplementsInterfaces() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  global Boolean getIsInterface() {}

  /**
   * Returns the three-character prefix code for the object. Record IDs are prefixed with three-character codes that specify the type of the object (for example, accounts have a prefix of 001 and opportunities have a prefix of 006 ).
   * @return String
   */
  global String getKeyPrefix() {}

  /**
   * Returns the object's label, which may or may not match the object name.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the object's plural label, which may or may not match the object name.
   * @return String
   */
  global String getLabelPlural() {}

  /**
   * Returns the name of the object, similar to the getName method. However, if the object is part of the current namespace, the namespace portion of the name is omitted.
   * @return String
   */
  global String getLocalName() {}

  /**
   * Returns the name of the object.
   * @return String
   */
  global String getName() {}

  /**
   * Returns a list of the record types supported by this object. The current user is not required to have access to a record type to see it in this list.
   * @return List<Schema.RecordTypeInfo>
   */
  global List<Schema.RecordTypeInfo> getRecordTypeInfos() {}

  /**
   * Returns a map that matches developer names to their associated record type. The current user is not required to have access to a record type to see it in this map.
   * @return Map<String, Schema.RecordTypeInfo>
   */
  global Map<String, Schema.RecordTypeInfo> getRecordTypeInfosByDeveloperName() {}

  /**
   * Returns a map that matches record IDs to their associated record types. The current user is not required to have access to a record type to see it in this map.
   * @return Schema.RecordTypeInfo
   */
  global Schema.RecordTypeInfo getRecordTypeInfosById() {}

  /**
   * Returns a map that matches record labels to their associated record type. The current user is not required to have access to a record type to see it in this map.
   * @return Schema.RecordTypeInfo
   */
  global Schema.RecordTypeInfo getRecordTypeInfosByName() {}

  /**
   * Returns the effective describe option used by the system for the SObject.
   * @return Schema.SObjectDescribeOptions
   */
  global Schema.SObjectDescribeOptions getSObjectDescribeOption() {}

  /**
   * Returns the Schema.SObjectType object for the sObject. You can use this to create a similar sObject.
   * @return Schema.SObjectType
   */
  global Schema.SObjectType getSobjectType() {}

  global Integer hashCode() {}

  /**
   * Returns true if the current user can see this object, false otherwise.
   * @return Boolean
   */
  global Boolean isAccessible() {}

  /**
   * Returns true if the object can be created by the current user, false otherwise.
   * @return Boolean
   */
  global Boolean isCreateable() {}

  /**
   * Returns true if the object is a custom object, false if it is a standard object.
   * @return Boolean
   */
  global Boolean isCustom() {}

  /**
   * Returns true if the object is a custom setting, false otherwise.
   * @return Boolean
   */
  global Boolean isCustomSetting() {}

  /**
   * Returns true if the object can be deleted by the current user, false otherwise.
   * @return Boolean
   */
  global Boolean isDeletable() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  global Boolean isDeprecatedAndHidden() {}

  /**
   * Returns true if Chatter feeds are enabled for the object, false otherwise. This method is only available for Apex classes and triggers saved using SalesforceAPI version 19.0 and later.
   * @return Boolean
   */
  global Boolean isFeedEnabled() {}

  /**
   * Returns true if the object can be merged with other objects of its type by the current user, false otherwise. true is returned for leads, contacts, and accounts.
   * @return Boolean
   */
  global Boolean isMergeable() {}

  /**
   * Returns true if Most Recently Used (MRU) list functionality is enabled for the object, false otherwise.
   * @return Boolean
   */
  global Boolean isMruEnabled() {}

  /**
   * Returns true if the object can be queried by the current user, false otherwise
   * @return Boolean
   */
  global Boolean isQueryable() {}

  /**
   * Returns true if the object can be searched by the current user, false otherwise.
   * @return Boolean
   */
  global Boolean isSearchable() {}

  /**
   * Returns true if the object can be undeleted by the current user, false otherwise.
   * @return Boolean
   */
  global Boolean isUndeletable() {}

  /**
   * Returns true if the object can be updated by the current user, false otherwise.
   * @return Boolean
   */
  global Boolean isUpdateable() {}

  global String toString() {}

  global String getAssociateEntityType() {}

  global Boolean getHasSubtypes() {}

  global Boolean getIsSubtype() {}

  global Object clone() {}

}