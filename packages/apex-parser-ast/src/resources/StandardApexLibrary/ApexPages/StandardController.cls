/**
 * Use a StandardController when defining an extension for a standard controller.
 */
public class StandardController {

  /**
   * When a Visualforce page is loaded, the fields accessible to the page are based on the fields referenced in the Visualforce markup. This method adds a reference to each field specified in fieldNames so that the controller can explicitly access those fields as well.
   * @param fieldNames 
   * @return Void
   */
  public Void addFields(List< String > fieldNames) {}

  /**
   * Returns the PageReference of the cancel page.
   * @return System.PageReference
   */
  public System.PageReference cancel() {}

  /**
   * Deletes record and returns the PageReference of the delete page.
   * @return System.PageReference
   */
  public System.PageReference delete() {}

  /**
   * Returns the PageReference of the standard edit page.
   * @return System.PageReference
   */
  public System.PageReference edit() {}

  /**
   * Returns the ID of the record that is currently in context, based on the value of the id query string parameter in the Visualforce page URL.
   * @return String
   */
  public String getId() {}

  /**
   * Returns the record that is currently in context, based on the value of the id query string parameter in the Visualforce page URL.
   * @return SObject
   */
  public SObject getRecord() {}

  /**
   * Forces the controller to reacquire access to newly referenced fields. Any changes made to the record prior to this method call are discarded.
   * @return Void
   */
  public Void reset() {}

  /**
   * Saves changes and returns the updated PageReference.
   * @return System.PageReference
   */
  public System.PageReference save() {}

  /**
   * Returns the PageReference object of the standard detail page.
   * @return System.PageReference
   */
  public System.PageReference view() {}

}