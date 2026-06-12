/**
 * Use ApexPages to add and check for messages associated with the current page, as well as to reference the current page.
 */
global class ApexPages {

  global ApexPages() {}

  /**
   * Add a message to the current page context.
   * @param message 
   */
  global void addMessage(ApexPages.Message message) {}

  /**
   * Adds a list of messages to the current page context based on a thrown exception.
   * @param exceptionThrown 
   */
  global void addMessages(Exception exceptionThrown) {}

  /**
   * Returns the current page's PageReference.
   * @return System.PageReference
   */
  global System.PageReference currentPage() {}

  /**
   * Returns a list of the messages associated with the current context.
   * @return ApexPages.Message[]
   */
  global ApexPages.Message[] getMessages() {}

  /**
   * Returns true if there are messages associated with the current context, false otherwise.
   * @return Boolean
   */
  global Boolean hasMessages() {}

  /**
   * Returns true if there are messages associated with the current context, false otherwise.
   * @param severity 
   * @return Boolean
   */
  global Boolean hasMessages(ApexPages.Severity severity) {}

  global Object clone() {}

}