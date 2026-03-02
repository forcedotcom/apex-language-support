/**
 * Contains methods for creating and manipulating data.
 */
public class Database {

  public static Database.LeadConvertResult convertLead(Database.LeadConvert leadToConvert, Boolean allOrNone) {}

  public static Database.LeadConvertResult[] convertLead(Database.LeadConvert[] leadsToConvert, Boolean allOrNone) {}

  /**
   * Returns the number of records that a dynamic SOQL query would return when executed.
   * @param query 
   * @return Integer
   */
  public static Integer countQuery(String query) {}

  /**
   * Deletes an existing sObject record, such as an individual account or contact, from your organization's data.
   * @param recordToDelete 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult delete(SObject recordToDelete, Boolean allOrNone) {}

  /**
   * Deletes an existing sObject record, such as an individual account or contact, from your organization's data.
   * @param recordsToDelete 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.DeleteResult[]
   */
  public static Database.DeleteResult[] delete(SObject[] recordsToDelete, Boolean allOrNone) {}

  /**
   * Deletes an existing sObject record, such as an individual account or contact, from your organization's data.
   * @param recordID 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult delete(ID recordID, Boolean allOrNone) {}

  /**
   * Deletes an existing sObject record, such as an individual account or contact, from your organization's data.
   * @param recordIDs 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.DeleteResult[]
   */
  public static Database.DeleteResult[] delete(ID [] recordIDs, Boolean allOrNone) {}

  /**
   * Initiates requests to delete the external data that corresponds to the specified external object records. The request is executed asynchronously, as a background operation, and is sent to the external system that's defined by the external object's associated external data source. Allows referencing a callback class whose processDelete method is called for each record after deletion.
   * @param sobjects List of external object records to delete.
   * @param callback The callback that contains the state in the originating context and an action (the processDelete method) that is executed after the insert operation is completed. Use the action callback to update org data according to the operation’s results. The callback object must extend DataSource.AsyncDeleteCallback .
   * @return List<Database.DeleteResult>
   */
  public static List<Database.DeleteResult> deleteAsync(List<SObject> sobjects, DataSource.AsyncDeleteCallback callback) {}

  /**
   * Initiates requests to delete the external data that corresponds to the specified external object records. The request is executed asynchronously, as a background operation, and is sent to the external system that's defined by the external object's associated external data source. Allows referencing a callback class whose processDelete method is called for each record after deletion.
   * @param sobject 
   * @param callback The callback that contains the state in the originating context and an action (the processDelete method) that is executed after the insert operation is completed. Use the action callback to update org data according to the operation’s results. The callback object must extend DataSource.AsyncDeleteCallback .
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult deleteAsync(SObject sobject, DataSource.AsyncDeleteCallback callback) {}

  /**
   * Initiates requests to delete the external data that corresponds to the specified external object records. The request is executed asynchronously, as a background operation, and is sent to the external system that's defined by the external object's associated external data source. Allows referencing a callback class whose processDelete method is called for each record after deletion.
   * @param sobjects List of external object records to delete.
   * @return List<Database.DeleteResult>
   */
  public static List<Database.DeleteResult> deleteAsync(List<SObject> sobjects) {}

  /**
   * Initiates requests to delete the external data that corresponds to the specified external object records. The request is executed asynchronously, as a background operation, and is sent to the external system that's defined by the external object's associated external data source. Allows referencing a callback class whose processDelete method is called for each record after deletion.
   * @param sobject 
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult deleteAsync(SObject sobject) {}

  /**
   * Initiates requests to delete the external data that corresponds to the specified external object records. The requests are executed synchronously and are sent to the external systems that are defined by the external objects' associated external data sources. If the Apex transaction contains pending changes, the synchronous operations can't be completed and throw exceptions.
   * @param sobjects List of external object records to delete.
   * @return List<Database.DeleteResult>
   */
  public static List<Database.DeleteResult> deleteImmediate(List<SObject> sobjects) {}

  /**
   * Initiates requests to delete the external data that corresponds to the specified external object records. The requests are executed synchronously and are sent to the external systems that are defined by the external objects' associated external data sources. If the Apex transaction contains pending changes, the synchronous operations can't be completed and throw exceptions.
   * @param sobject 
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult deleteImmediate(SObject sobject) {}

  /**
   * Permanently deletes the specified records from the Recycle Bin.
   * @param recordIds 
   * @return Database.EmptyRecycleBinResult[]
   */
  public static Database.EmptyRecycleBinResult[] emptyRecycleBin(ID [] recordIds) {}

  /**
   * Permanently deletes the specified records from the Recycle Bin.
   * @param obj 
   * @return Database.EmptyRecycleBinResult
   */
  public static Database.EmptyRecycleBinResult emptyRecycleBin(sObject obj) {}

  /**
   * Permanently deletes the specified records from the Recycle Bin.
   * @param listOfSObjects 
   * @return Database.EmptyRecycleBinResult[]
   */
  public static Database.EmptyRecycleBinResult[] emptyRecycleBin(sObject[] listOfSObjects) {}

  /**
   * Submits a batch Apex job for execution corresponding to the specified class.
   * @param batchClassObject An instance of a class that implements the Database.Batchable interface .
   * @return ID
   */
  public static ID executeBatch(Object batchClassObject) {}

  /**
   * Submits a batch Apex job for execution corresponding to the specified class.
   * @param batchClassObject An instance of a class that implements the Database.Batchable interface .
   * @param scope 
   * @return ID
   */
  public static ID executeBatch(Object batchClassObject, Integer scope) {}

  /**
   * Retrieves the status of an asynchronous delete operation that’s identified by a Database.DeleteResult object.
   * @param deleteResult The result record for the delete operation being retrieved.
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult getAsyncDeleteResult(Database.DeleteResult deleteResult) {}

  /**
   * Retrieves the status of an asynchronous delete operation that’s identified by a Database.DeleteResult object.
   * @param asyncLocator 
   * @return Database.DeleteResult
   */
  public static Database.DeleteResult getAsyncDeleteResult(String asyncLocator) {}

  /**
   * Returns the asyncLocator associated with the result of a specified asynchronous insert, update, or delete operation.
   * @param result The saved result of an asynchronous insert, update, or delete operation. The result object can be of type Database.SaveResult or Database.DeleteResult .
   * @return String
   */
  public static String getAsyncLocator(Object result) {}

  /**
   * Returns the status of an asynchronous insert or update operation that’s identified by a Database.SaveResult object.
   * @param saveResult The result record for the insert or update operation being retrieved.
   * @return Database.SaveResult
   */
  public static Database.SaveResult getAsyncSaveResult(Database.SaveResult saveResult) {}

  /**
   * Returns the status of an asynchronous insert or update operation that’s identified by a Database.SaveResult object.
   * @param asyncLocator 
   * @return Database.SaveResult
   */
  public static Database.SaveResult getAsyncSaveResult(String asyncLocator) {}

  /**
   * Returns the list of individual records that have been deleted for an sObject type within the specified start and end dates and times and that are still in the Recycle Bin.
   * @param sObjectType The sObjectType argument is the sObject type name for which to get the deleted records, such as account or merchandise__c.
   * @param startDate Start date and time of the deleted records time window.
   * @param endDate End date and time of the deleted records time window.
   * @return Database.GetDeletedResult
   */
  public static Database.GetDeletedResult getDeleted(String sObjectType, Datetime startDate, Datetime endDate) {}

  /**
   * Creates a QueryLocator object used in batch Apex or Visualforce.
   * @param staticSoqlQueryResult The staticSoqlQueryResult parameter must be a static, inline SOQL query.
   * @return Database. QueryLocator
   */
  public static Database. QueryLocator getQueryLocator(sObject [] staticSoqlQueryResult) {}

  /**
   * Creates a QueryLocator object used in batch Apex or Visualforce.
   * @param query 
   * @return Database.QueryLocator
   */
  public static Database.QueryLocator getQueryLocator(String query) {}

  /**
   * Returns the list of individual records that have been updated for an sObject type within the specified start and end dates and times.
   * @param sobjectType The sObjectType argument is the sObject type name for which to get the updated records, such as account or merchandise__c.
   * @param startDate The startDate argument is the start date and time of the updated records time window.
   * @param endDate The endDate argument is the end date and time of the updated records time window.
   * @return Database.GetUpdatedResult
   */
  public static Database.GetUpdatedResult getUpdated(String sobjectType, Datetime startDate, Datetime endDate) {}

  /**
   * Adds an sObject, such as an individual account or contact, to your organization's data.
   * @param recordToInsert 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.SaveResult
   */
  public static Database.SaveResult insert(sObject recordToInsert, Boolean allOrNone) {}

  /**
   * Adds an sObject, such as an individual account or contact, to your organization's data.
   * @param recordsToInsert 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.SaveResult[]
   */
  public static Database.SaveResult[] insert(sObject[] recordsToInsert, Boolean allOrNone) {}

  /**
   * Adds an sObject, such as an individual account or contact, to your organization's data.
   * @param recordToInsert 
   * @param dmlOptions 
   * @return Database.SaveResult
   */
  public static Database.SaveResult insert(sObject recordToInsert, Database.DMLOptions dmlOptions) {}

  /**
   * Adds an sObject, such as an individual account or contact, to your organization's data.
   * @param recordsToInsert 
   * @param dmlOptions 
   * @return Database.SaveResult
   */
  public static Database.SaveResult insert(sObject[] recordsToInsert, Database.DMLOptions dmlOptions) {}

  /**
   * Initiates requests to add external object data to the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobjects List of external object records to insert.
   * @param callback The callback object that contains the state in the originating context and an action (the processSave method) that executes after the insert operation is completed. Use the action callback to update org data according to the operation’s results. The callback object must extend DataSource.AsyncSaveCallback .
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> insertAsync(List<SObject> sobjects, DataSource.AsyncSaveCallback callback) {}

  /**
   * Initiates requests to add external object data to the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobject 
   * @param callback The callback object that contains the state in the originating context and an action (the processSave method) that executes after the insert operation is completed. Use the action callback to update org data according to the operation’s results. The callback object must extend DataSource.AsyncSaveCallback .
   * @return Database.SaveResult
   */
  public static Database.SaveResult insertAsync(SObject sobject, DataSource.AsyncSaveCallback callback) {}

  /**
   * Initiates requests to add external object data to the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobjects List of external object records to insert.
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> insertAsync(List<SObject> sobjects) {}

  /**
   * Initiates requests to add external object data to the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobject 
   * @return Database.SaveResult
   */
  public static Database.SaveResult insertAsync(SObject sobject) {}

  /**
   * Initiates requests to add external object data to the relevant external systems. The requests are executed synchronously and are sent to the external systems that are defined by the external objects' associated external data sources. If the Apex transaction contains pending changes, the synchronous operations can't be completed and throw exceptions.
   * @param sobjects List of external object records to insert.
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> insertImmediate(List<SObject> sobjects) {}

  /**
   * Initiates requests to add external object data to the relevant external systems. The requests are executed synchronously and are sent to the external systems that are defined by the external objects' associated external data sources. If the Apex transaction contains pending changes, the synchronous operations can't be completed and throw exceptions.
   * @param sobject 
   * @return Database.SaveResult
   */
  public static Database.SaveResult insertImmediate(SObject sobject) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateId The ID of the record to merge with the mergeToRecord. This record must be of the same sObject type as the mergeToRecord.
   * @return Database.MergeResult
   */
  public static Database.MergeResult merge(sObject mergeToRecord, Id duplicateId) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateRecord 
   * @return Database.MergeResult
   */
  public static Database.MergeResult merge(sObject mergeToRecord, sObject duplicateRecord) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateIds 
   * @return List<Database.MergeResult>
   */
  public static List<Database.MergeResult> merge(sObject mergeToRecord, List<Id> duplicateIds) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateRecords 
   * @return List<Database.MergeResult>
   */
  public static List<Database.MergeResult> merge(sObject mergeToRecord, List<SObject> duplicateRecords) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateId The ID of the record to merge with the mergeToRecord. This record must be of the same sObject type as the mergeToRecord.
   * @param allOrNone 
   * @return Database.MergeResult
   */
  public static Database.MergeResult merge(sObject mergeToRecord, Id duplicateId, Boolean allOrNone) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateRecord 
   * @param allOrNone 
   * @return Database.MergeResult
   */
  public static Database.MergeResult merge(sObject mergeToRecord, sObject duplicateRecord, Boolean allOrNone) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateIds 
   * @param allOrNone 
   * @return List<Database.MergeResult>
   */
  public static List<Database.MergeResult> merge(sObject mergeToRecord, List<Id> duplicateIds, Boolean allOrNone) {}

  /**
   * Merges the duplicate record into the mergeToRecord sObject record of the same type, deleting the duplicate, and reparenting any related records. Merges only accounts, contacts, or leads.
   * @param mergeToRecord The sObject record that the duplicate record is merged into.
   * @param duplicateRecords 
   * @param allOrNone 
   * @return List<Database.MergeResult>
   */
  public static List<Database.MergeResult> merge(sObject mergeToRecord, List<SObject> duplicateRecords, Boolean allOrNone) {}

  /**
   * Creates a dynamic SOQL query at runtime.
   * @param queryString 
   * @return List<SObject>
   */
  public static List<SObject> query(String queryString) {}

  /**
   * Restores the database to the state specified by the savepoint variable. Any emails submitted since the last savepoint are also rolled back and not sent.
   * @param databaseSavepoint 
   * @return Void
   */
  public static Void rollback(System.Savepoint databaseSavepoint) {}

  /**
   * Returns a savepoint variable that can be stored as a local variable, then used with the rollback method to restore the database to that point.
   * @return System.Savepoint
   */
  public static System.Savepoint setSavepoint() {}

  /**
   * Restores an existing sObject record, such as an individual account or contact, from your organization's Recycle Bin.
   * @param recordToUndelete 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.UndeleteResult
   */
  public static Database.UndeleteResult undelete(sObject recordToUndelete, Boolean allOrNone) {}

  /**
   * Restores an existing sObject record, such as an individual account or contact, from your organization's Recycle Bin.
   * @param recordsToUndelete 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.UndeleteResult[]
   */
  public static Database.UndeleteResult[] undelete(sObject[] recordsToUndelete, Boolean allOrNone) {}

  /**
   * Restores an existing sObject record, such as an individual account or contact, from your organization's Recycle Bin.
   * @param recordID 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.UndeleteResult
   */
  public static Database.UndeleteResult undelete(ID recordID, Boolean allOrNone) {}

  /**
   * Restores an existing sObject record, such as an individual account or contact, from your organization's Recycle Bin.
   * @param recordIDs 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.UndeleteResult[]
   */
  public static Database.UndeleteResult[] undelete(ID [] recordIDs, Boolean allOrNone) {}

  /**
   * Modifies an existing sObject record, such as an individual account or contact, in your organization's data.
   * @param recordToUpdate 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.SaveResult
   */
  public static Database.SaveResult update(sObject recordToUpdate, Boolean allOrNone) {}

  /**
   * Modifies an existing sObject record, such as an individual account or contact, in your organization's data.
   * @param recordsToUpdate 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.SaveResult[]
   */
  public static Database.SaveResult[] update(sObject[] recordsToUpdate, Boolean allOrNone) {}

  /**
   * Modifies an existing sObject record, such as an individual account or contact, in your organization's data.
   * @param recordToUpdate 
   * @param dmlOptions 
   * @return Database.SaveResult
   */
  public static Database.SaveResult update(sObject recordToUpdate, Database.DmlOptions dmlOptions) {}

  /**
   * Modifies an existing sObject record, such as an individual account or contact, in your organization's data.
   * @param recordsToUpdate 
   * @param dmlOptions 
   * @return Database.SaveResult[]
   */
  public static Database.SaveResult[] update(sObject[] recordsToUpdate, Database.DMLOptions dmlOptions) {}

  /**
   * Creates a new sObject record or updates an existing sObject record within a single statement, using a specified field to determine the presence of existing objects, or the ID field if no field is specified.
   * @param recordToUpsert 
   * @param externalIDField 
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.UpsertResult
   */
  public static Database.UpsertResult upsert(sObject recordToUpsert, Schema.SObjectField externalIDField, Boolean allOrNone) {}

  /**
   * Creates a new sObject record or updates an existing sObject record within a single statement, using a specified field to determine the presence of existing objects, or the ID field if no field is specified.
   * @param recordsToUpsert 
   * @param externalIdField (Optional) The externalIdField is of type Schema.SObjectField , that is, a field token. Find the token for the field by using the fields special method. For example, Schema.SObjectField f = Account.Fields.MyExternalId . The externalIdField parameter is the field that upsert () uses to match sObjects with existing records. This field can be a custom field marked as external ID, or a standard field with the idLookup attribute. Note If externalIdField isn’t specified, then the ID field is used to determine a match with existing records.
   * @param allOrNone (Optional) The allOrNone parameter specifies whether the operation allows partial success. If allOrNone is set to false and a record fails, the remainder of the DML operation can still succeed. You must iterate through the returned results to identify which records succeeded or failed. If allOrNone is set to true and the method isn’t successful, an exception is thrown. The default for the parameter is true .
   * @return Database.UpsertResult[]
   */
  public static Database.UpsertResult[] upsert(sObject[] recordsToUpsert, Schema.SObjectField externalIdField, Boolean allOrNone) {}

  /**
   * Initiates requests to update external object data on the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobjects List of external object records to modify.
   * @param callback The callback object that contains the state in the originating context and an action (the processSave method) that executes after the insert operation is completed. Use the action callback to update org data according to the operation’s results. The callback object must extend DataSource.AsyncSaveCallback .
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> updateAsync(List<SObject> sobjects, DataSource.AsyncSaveCallback callback) {}

  /**
   * Initiates requests to update external object data on the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobject 
   * @param callback The callback object that contains the state in the originating context and an action (the processSave method) that executes after the insert operation is completed. Use the action callback to update org data according to the operation’s results. The callback object must extend DataSource.AsyncSaveCallback .
   * @return Database.SaveResult
   */
  public static Database.SaveResult updateAsync(SObject sobject, DataSource.AsyncSaveCallback callback) {}

  /**
   * Initiates requests to update external object data on the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobjects List of external object records to modify.
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> updateAsync(List<SObject> sobjects) {}

  /**
   * Initiates requests to update external object data on the relevant external systems. The requests are executed asynchronously, as background operations, and are sent to the external systems that are defined by the external objects' associated external data sources. Allows referencing a callback class whose processSave method is called for each record after the remote operations are completed.
   * @param sobject 
   * @return Database.SaveResult
   */
  public static Database.SaveResult updateAsync(SObject sobject) {}

  /**
   * Initiates requests to update external object data on the relevant external systems. The requests are executed synchronously and are sent to the external systems that are defined by the external objects' associated external data sources. If the Apex transaction contains pending changes, the synchronous operations can't be completed and throw exceptions.
   * @param sobjects List of external object records to modify.
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> updateImmediate(List<SObject> sobjects) {}

  /**
   * Initiates requests to update external object data on the relevant external systems. The requests are executed synchronously and are sent to the external systems that are defined by the external objects' associated external data sources. If the Apex transaction contains pending changes, the synchronous operations can't be completed and throw exceptions.
   * @param sobject 
   * @return Database.SaveResult
   */
  public static Database.SaveResult updateImmediate(SObject sobject) {}

}