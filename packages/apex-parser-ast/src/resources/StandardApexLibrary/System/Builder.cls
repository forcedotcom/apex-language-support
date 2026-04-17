/**
 * Build a unique signature for your queueable job using this inner builder class. The build() class method builds a QueueableDuplicateSignature object, with input from the addId() , addInteger() , and addString() methods. Use the DuplicateSignature property in the AsyncOptions class to store the queueable job signature. Enqueue your job by using the System.enqueueJob() with the AsyncOptions parameter.
 */
global class Builder {

  public System.QueueableDuplicateSignature.Builder addId(Id id) {}

  public System.QueueableDuplicateSignature.Builder addInteger(Integer i) {}

  public System.QueueableDuplicateSignature.Builder addString(String s) {}

  public System.QueueableDuplicateSignature build() {}

  public Integer getMaxSize() {}

  public Integer getRemainingSize() {}

  public Integer getSize() {}

}