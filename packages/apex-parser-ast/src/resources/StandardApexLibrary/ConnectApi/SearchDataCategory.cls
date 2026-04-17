/**
 * Data category input for object search.
 */
global class SearchDataCategory {

  /**
   * List of data category names to filter.
   */
  global List < String > categories;

  /**
   * Name of the data category group to filter.
   */
  global String groupName;

  /**
   * Data category operator. Above —Queries the data category and all of its parent categories. AboveOrBelow —Queries the data category, all of its parent categories, and all of its subcategories. At —Queries the data category. Below —Queries the data category and all of its subcategories.
   */
  global ConnectApi.DataCategoryOperator operator;

}