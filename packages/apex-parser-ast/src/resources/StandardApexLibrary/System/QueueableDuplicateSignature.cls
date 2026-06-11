/**
 * Used in the AsyncOptions class to store the queueable job signature in the DuplicateSignature property.
 */
global class QueueableDuplicateSignature {

  global QueueableDuplicateSignature() {}

  global String toString() {}

  global static System.QueueableDuplicateSignature.Builder builder() {}

  global Object clone() {}

  /**
   * Build a unique signature for your queueable job using this inner builder class. The build() class method builds a QueueableDuplicateSignature object, with input from the addId() , addInteger() , and addString() methods. Use the DuplicateSignature property in the AsyncOptions class to store the queueable job signature. Enqueue your job by using the System.enqueueJob() with the AsyncOptions parameter.
   */
  global class Builder {

    global Builder() {}

    global System.QueueableDuplicateSignature.Builder addId(Id id) {}

    global System.QueueableDuplicateSignature.Builder addInteger(Integer i) {}

    global System.QueueableDuplicateSignature.Builder addString(String s) {}

    global System.QueueableDuplicateSignature build() {}

    global Integer getMaxSize() {}

    global Integer getRemainingSize() {}

    global Integer getSize() {}

    global Object clone() {}

  }

}