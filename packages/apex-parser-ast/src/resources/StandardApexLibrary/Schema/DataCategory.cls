/**
 * Represents the categories within a category group.
 */
public class DataCategory {

  /**
   * Returns a recursive object that contains the visible sub categories in the data category.
   * @return Schema.DataCategory
   */
  public Schema.DataCategory getChildCategories() {}

  /**
   * Returns the label for the data category used in the Salesforce user interface.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the unique name used by the API to access to the data category.
   * @return String
   */
  public String getName() {}

}