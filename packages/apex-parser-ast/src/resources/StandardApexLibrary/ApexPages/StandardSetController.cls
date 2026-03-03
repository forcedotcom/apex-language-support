/**
 * StandardSetController objects allow you to create list controllers similar to, or as extensions of, the pre-built Visualforce list controllers provided by Salesforce.
 */
global class StandardSetController {

  /**
   * Returns the PageReference of the original page, if known, or the home page.
   * @return System.PageReference
   */
  public System.PageReference cancel() {}

  public void first() {}

  /**
   * Indicates whether there are more records in the set than the maximum record limit. If this is false, there are more records than you can process using the list controller. The maximum record limit is 10,000 records.
   * @return Boolean
   */
  public Boolean getCompleteResult() {}

  /**
   * Returns the ID of the filter that is currently in context.
   * @return String
   */
  public String getFilterId() {}

  /**
   * Indicates whether there are more records after the current page set.
   * @return Boolean
   */
  public Boolean getHasNext() {}

  /**
   * Indicates whether there are more records before the current page set.
   * @return Boolean
   */
  public Boolean getHasPrevious() {}

  /**
   * Returns a list of the listviews available to the current user.
   * @return System.SelectOption
   */
  public System.SelectOption getListViewOptions() {}

  /**
   * Returns the page number of the current page set. Note that the first page returns 1.
   * @return Integer
   */
  public Integer getPageNumber() {}

  /**
   * Returns the number of records included in each page set.
   * @return Integer
   */
  public Integer getPageSize() {}

  /**
   * Returns the sObject that represents the changes to the selected records. This retrieves the prototype object contained within the class, and is used for performing mass updates.
   * @return sObject
   */
  public sObject getRecord() {}

  /**
   * Returns the list of sObjects in the current page set. This list is immutable, i.e. you can't call clear () on it.
   * @return sObject[]
   */
  public sObject[] getRecords() {}

  /**
   * Returns the number of records in the set.
   * @return Integer
   */
  public Integer getResultSize() {}

  /**
   * Returns the list of sObjects that have been selected.
   * @return sObject[]
   */
  public sObject[] getSelected() {}

  public void last() {}

  public void next() {}

  public void previous() {}

  /**
   * Inserts new records or updates existing records that have been changed. After this operation is finished, it returns a PageReference to the original page, if known, or the home page.
   * @return System.PageReference
   */
  public System.PageReference save() {}

  /**
   * Sets the filter ID of the controller.
   * @param filterId 
   */
  public void setFilterID(String filterId) {}

  /**
   * Sets the page number.
   * @param pageNumber 
   */
  public void setpageNumber(Integer pageNumber) {}

  /**
   * Sets the number of records in each page set.
   * @param pageSize 
   */
  public void setPageSize(Integer pageSize) {}

  public void setSelected(sObject[] selectedRecords) {}

}