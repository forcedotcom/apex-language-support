/**
 * IdeaStandardController objects offer Ideas-specific functionality in addition to what is provided by the StandardController .
 */
global class IdeaStandardController {

  global IdeaStandardController() {}

  /**
   * Returns the list of read-only comments from the current page.
   * @return IdeaComment[]
   */
  global IdeaComment[] getCommentList() {}

  global void addFields(List<String> fieldNames) {}

  global System.PageReference cancel() {}

  global System.PageReference delete() {}

  global System.PageReference edit() {}

  global String getId() {}

  global SObject getRecord() {}

  global System.PageReference save() {}

  global System.PageReference view() {}

  global Object clone() {}

}