/**
 * Contains methods for the sObject data type.
 */
public class SObject {

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   * @return Void
   */
  public Void addError(String errorMsg) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   * @param escape 
   * @return Void
   */
  public Void addError(String errorMsg, Boolean escape) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param exceptionError 
   * @return Void
   */
  public Void addError(Exception exceptionError) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param exceptionError 
   * @param escape 
   * @return Void
   */
  public Void addError(Exception exceptionError, Boolean escape) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   * @return Void
   */
  public Void addError(String errorMsg) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   * @param escape 
   * @return Void
   */
  public Void addError(String errorMsg, Boolean escape) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param fieldName 
   * @param errorMsg The error message to mark the record with.
   */
  public void addError(String fieldName, String errorMsg) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param fieldName 
   * @param errorMsg The error message to mark the record with.
   * @param escape 
   */
  public void addError(String fieldName, String errorMsg, Boolean escape) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param fieldToken 
   * @param errorMsg The error message to mark the record with.
   * @param escape 
   */
  public void addError(Schema.SObjectField fieldToken, String errorMsg, Boolean escape) {}

  /**
   * Clears all field values
   * @return Void
   */
  public Void clear() {}

  /**
   * Creates a copy of the SObject record.
   * @param preserveId 
   * @return SObject
   */
  public SObject clone(Boolean preserveId) {}

  /**
   * Creates a copy of the SObject record.
   * @param preserveId 
   * @param isDeepClone 
   * @return SObject
   */
  public SObject clone(Boolean preserveId, Boolean isDeepClone) {}

  /**
   * Creates a copy of the SObject record.
   * @param preserveId 
   * @param isDeepClone 
   * @param preserveReadonlyTimestamps 
   * @return SObject
   */
  public SObject clone(Boolean preserveId, Boolean isDeepClone, Boolean preserveReadonlyTimestamps) {}

  /**
   * Creates a copy of the SObject record.
   * @param preserveId 
   * @param isDeepClone 
   * @param preserveReadonlyTimestamps 
   * @param preserveAutonumber 
   * @return SObject
   */
  public SObject clone(Boolean preserveId, Boolean isDeepClone, Boolean preserveReadonlyTimestamps, Boolean preserveAutonumber) {}

  /**
   * Returns the value for the field specified by fieldName , such as AccountNumber .
   * @param fieldName 
   * @return Object
   */
  public Object get(String fieldName) {}

  /**
   * Returns the value for the field specified by fieldName , such as AccountNumber .
   * @param field 
   * @return Object
   */
  public Object get(Schema.sObjectField field) {}

  /**
   * Returns the ID of the entity from which an object was cloned. You can use it for objects cloned through the Salesforce user interface. You can also use it for objects created using the System.SObject. clone(preserveId, isDeepClone, preserveReadonlyTimestamps, preserveAutonumber) method, provided that the preserveId parameter wasn’t used or was set to false . The getCloneSourceId() method can only be used within the transaction where the entity is cloned, as clone information doesn’t persist in subsequent transactions.
   * @return Id
   */
  public Id getCloneSourceId() {}

  /**
   * Returns a list of Database.Error objects for an SObject instance. If the SObject has no errors, an empty list is returned.
   * @return List<Database.Error>
   */
  public List<Database.Error> getErrors() {}

  /**
   * Returns the database.DMLOptions object for the SObject.
   * @return Database.DMLOptions
   */
  public Database.DMLOptions getOptions() {}

  /**
   * Returns a map of populated field names and their corresponding values. The map contains only the fields that have been populated in memory for the SObject instance.
   * @return Map< String , Object >
   */
  public Map< String , Object > getPopulatedFieldsAsMap() {}

  /**
   * Returns the value for the specified field. This method is primarily used with dynamic DML to access values for external IDs.
   * @param fieldName 
   * @return SObject
   */
  public SObject getSObject(String fieldName) {}

  /**
   * Returns the value for the specified field. This method is primarily used with dynamic DML to access values for external IDs.
   * @param field 
   * @return SObject
   */
  public SObject getSObject(Schema.SObjectField field) {}

  /**
   * Returns the values for the specified field. This method is primarily used with dynamic DML to access values for associated objects, such as child relationships.
   * @param fieldName 
   * @return SObject[]
   */
  public SObject[] getSObjects(String fieldName) {}

  /**
   * Returns the values for the specified field. This method is primarily used with dynamic DML to access values for associated objects, such as child relationships.
   * @param fieldName 
   * @return SObject[]
   */
  public SObject[] getSObjects(Schema.SObjectType fieldName) {}

  /**
   * Returns the token for this SObject. This method is primarily used with describe information.
   * @return Schema.SObjectType
   */
  public Schema.SObjectType getSObjectType() {}

  /**
   * Retrieves the name of a quick action associated with this SObject. Typically used in triggers.
   * @return String
   */
  public String getQuickActionName() {}

  /**
   * Returns true if an SObject instance has associated errors. The error message can be associated to the SObject instance by using SObject.addError() , validation rules, or by other means.
   * @return Boolean
   */
  public Boolean hasErrors() {}

  /**
   * Returns true if an entity is cloned from something, even if the entity hasn’t been saved. The method can only be used within the transaction where the entity is cloned, as clone information doesn’t persist in subsequent transactions.
   * @return Boolean
   */
  public Boolean isClone() {}

  /**
   * Returns information about the queried sObject field. Returns true if the sObject field is populated, either by direct assignment or by inclusion in a SOQL query. Returns false if the sObject field isn’t set. If an invalid field is specified, an SObjectException is thrown.
   * @param fieldName 
   * @return Boolean
   */
  public Boolean isSet(String fieldName) {}

  /**
   * Returns information about the queried sObject field. Returns true if the sObject field is populated, either by direct assignment or by inclusion in a SOQL query. Returns false if the sObject field isn’t set. If an invalid field is specified, an SObjectException is thrown.
   * @param field 
   * @return Boolean
   */
  public Boolean isSet(Schema.SObjectField field) {}

  /**
   * Sets the value for the specified field and returns the previous value for the field.
   * @param fieldName 
   * @param value 
   * @return Object
   */
  public Object put(String fieldName, Object value) {}

  /**
   * Sets the value for the specified field and returns the previous value for the field.
   * @param field 
   * @param value 
   * @return Object
   */
  public Object put(Schema.SObjectField field, Object value) {}

  /**
   * Sets the value for the specified field. This method is primarily used with dynamic DML for setting external IDs. The method returns the previous value of the field.
   * @param fieldName 
   * @param value 
   * @return SObject
   */
  public SObject putSObject(String fieldName, SObject value) {}

  /**
   * Sets the value for the specified field. This method is primarily used with dynamic DML for setting external IDs. The method returns the previous value of the field.
   * @param fieldName 
   * @param value 
   * @return SObject
   */
  public SObject putSObject(Schema.SObjectType fieldName, SObject value) {}

  public Void recalculateFormulas() {}

  /**
   * Sets the DMLOptions object for the SObject.
   * @param DMLOptions 
   * @return Void
   */
  public Void setOptions(database.DMLOptions DMLOptions) {}

}