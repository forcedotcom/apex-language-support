/**
 * Specifies the success or exception status of the parent Queueable job to which a Transaction Finalizer is attached.
 */
global enum ParentJobResult {
  SUCCESS,
  UNHANDLED_EXCEPTION
}