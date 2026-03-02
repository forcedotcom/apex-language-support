/**
 * Use ApexPages to add and check for messages associated with the current page, as well as to reference the current page.
 */
public class ApexPages {

  /**
   * Add a message to the current page context.
   * @param message 
   * @return Void
   */
  public Void addMessage(ApexPages.Message message) {}

  /**
   * Adds a list of messages to the current page context based on a thrown exception.
   * @param exceptionThrown 
   * @return Void
   */
  public Void addMessages(Exception exceptionThrown) {}

  /**
   * Returns the current page's PageReference.
   * @return System.PageReference
   */
  public System.PageReference currentPage() {}

  /**
   * Returns a list of the messages associated with the current context.
   * @return ApexPages.Message[]
   */
  public ApexPages.Message[] getMessages() {}

  /**
   * Returns true if there are messages associated with the current context, false otherwise.
   * @return Boolean
   */
  public Boolean hasMessages() {}

  /**
   * Returns true if there are messages associated with the current context, false otherwise.
   * @param severity 
   * @return Boolean
   */
  public Boolean hasMessages(ApexPages.Severity severity) {}

}