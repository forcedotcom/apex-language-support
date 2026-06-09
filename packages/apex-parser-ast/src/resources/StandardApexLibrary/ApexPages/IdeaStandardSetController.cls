/**
 * IdeaStandardSetController objects offer Ideas-specific functionality in addition to what is provided by the StandardSetController .
 */
global class IdeaStandardSetController {

  global IdeaStandardSetController() {}

  /**
   * Returns the list of read-only ideas in the current page set.
   * @return Idea[]
   */
  global Idea[] getIdeaList() {}

  global void addFields(List<String> fieldNames) {}

  global System.PageReference cancel() {}

  global void first() {}

  global Boolean getCompleteResult() {}

  global String getFilterId() {}

  global Boolean getHasNext() {}

  global Boolean getHasPrevious() {}

  global List<System.SelectOption> getListViewOptions() {}

  global Integer getPageNumber() {}

  global Integer getPageSize() {}

  global SObject getRecord() {}

  global List<SObject> getRecords() {}

  global Integer getResultSize() {}

  global List<SObject> getSelected() {}

  global void last() {}

  global void next() {}

  global void previous() {}

  global System.PageReference save() {}

  global void setFilterId(String filterId) {}

  global void setPageNumber(Integer pageNumber) {}

  global void setPageSize(Integer pageSize) {}

  global void setSelected(List<SObject> selected) {}

  global Object clone() {}

}