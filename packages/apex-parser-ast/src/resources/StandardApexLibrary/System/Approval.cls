/**
 * Contains methods for processing approval requests and setting approval-process locks and unlocks on records.
 */
public class Approval {

  /**
   * Returns true if the record with the ID id is locked, or false if it’s not.
   * @param id The ID of the record whose lock or unlock status is in question.
   * @return Boolean
   */
  public static Boolean isLocked(Id id) {}

  /**
   * Returns true if the record with the ID id is locked, or false if it’s not.
   * @param ids 
   * @return Map<Id, Boolean >
   */
  public static Map<Id, Boolean > isLocked(List<Id> ids) {}

  /**
   * Returns true if the record with the ID id is locked, or false if it’s not.
   * @param sobject 
   * @return Boolean
   */
  public static Boolean isLocked(SObject sobject) {}

  /**
   * Returns true if the record with the ID id is locked, or false if it’s not.
   * @param sobjects 
   * @return Map<Id, Boolean >
   */
  public static Map<Id, Boolean > isLocked(List<SObject> sobjects) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordId ID of the object to lock.
   * @return Approval.LockResult
   */
  public static Approval.LockResult lock(Id recordId) {}

  /**
   * Locks an object, and returns the lock results.
   * @param ids 
   * @return List<Approval.LockResult>
   */
  public static List<Approval.LockResult> lock(List<Id> ids) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordToLock 
   * @return Approval.LockResult
   */
  public static Approval.LockResult lock(SObject recordToLock) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordsToLock 
   * @return List<Approval.LockResult>
   */
  public static List<Approval.LockResult> lock(List<SObject> recordsToLock) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordId ID of the object to lock.
   * @param allOrNothing 
   * @return Approval.LockResult
   */
  public static Approval.LockResult lock(Id recordId, Boolean allOrNothing) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordIds 
   * @param allOrNothing 
   * @return List<Approval.LockResult>
   */
  public static List<Approval.LockResult> lock(List<Id> recordIds, Boolean allOrNothing) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordToLock 
   * @param allOrNothing 
   * @return Approval.LockResult
   */
  public static Approval.LockResult lock(SObject recordToLock, Boolean allOrNothing) {}

  /**
   * Locks an object, and returns the lock results.
   * @param recordsToLock 
   * @param allOrNothing 
   * @return List<Approval.LockResult>
   */
  public static List<Approval.LockResult> lock(List<SObject> recordsToLock, Boolean allOrNothing) {}

  /**
   * Submits a new approval request and approves or rejects existing approval requests.
   * @param approvalRequest 
   * @return Approval.ProcessResult
   */
  public static Approval.ProcessResult process(Approval.ProcessRequest approvalRequest) {}

  /**
   * Submits a new approval request and approves or rejects existing approval requests.
   * @param approvalRequest 
   * @param allOrNone 
   * @return Approval.ProcessResult
   */
  public static Approval.ProcessResult process(Approval.ProcessRequest approvalRequest, Boolean allOrNone) {}

  /**
   * Submits a new approval request and approves or rejects existing approval requests.
   * @param approvalRequests 
   * @return Approval.ProcessResult []
   */
  public static Approval.ProcessResult [] process(Approval.ProcessRequest[] approvalRequests) {}

  /**
   * Submits a new approval request and approves or rejects existing approval requests.
   * @param approvalRequests 
   * @param allOrNone 
   * @return Approval.ProcessResult []
   */
  public static Approval.ProcessResult [] process(Approval.ProcessRequest[] approvalRequests, Boolean allOrNone) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordId ID of the object to unlock.
   * @return Approval.UnlockResult
   */
  public static Approval.UnlockResult unlock(Id recordId) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordIds 
   * @return List<Approval.UnlockResult>
   */
  public static List<Approval.UnlockResult> unlock(List<Id> recordIds) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordToUnlock 
   * @return Approval.UnlockResult
   */
  public static Approval.UnlockResult unlock(SObject recordToUnlock) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordsToUnlock 
   * @return List<Approval.UnlockResult>
   */
  public static List<Approval.UnlockResult> unlock(List<SObject> recordsToUnlock) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordId ID of the object to unlock.
   * @param allOrNothing 
   * @return Approval.UnlockResult
   */
  public static Approval.UnlockResult unlock(Id recordId, Boolean allOrNothing) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordIds 
   * @param allOrNothing 
   * @return List<Approval.UnlockResult>
   */
  public static List<Approval.UnlockResult> unlock(List<Id> recordIds, Boolean allOrNothing) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordToUnlock 
   * @param allOrNothing 
   * @return Approval.UnlockResult
   */
  public static Approval.UnlockResult unlock(SObject recordToUnlock, Boolean allOrNothing) {}

  /**
   * Unlocks an object, and returns the unlock results.
   * @param recordsToUnlock 
   * @param allOrNothing 
   * @return List<Approval.UnlockResult>
   */
  public static List<Approval.UnlockResult> unlock(List<SObject> recordsToUnlock, Boolean allOrNothing) {}

}