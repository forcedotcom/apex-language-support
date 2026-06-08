/**
 * IdeaStandardController objects offer Ideas-specific functionality in addition to what is provided by the StandardController .
 */
global class IdeaStandardController {

  global IdeaStandardController() {}

  /**
   * Returns the list of read-only comments from the current page.
   * @return IdeaComment[]
   */
  public IdeaComment[] getCommentList() {}

  global Object clone() {}

}