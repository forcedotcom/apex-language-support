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

  global Object clone() {}

}