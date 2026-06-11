/**
 * Representation for Note
 */
global class CommerceNote {

  global CommerceNote() {}

  /**
   * Content of the Note
   */
  global String content;

  /**
   * Date and time when the Note was last modified
   */
  global String contentModifiedDate;

  /**
   * Name of the user who created the Note
   */
  global String createdBy;

  /**
   * Title of the Note
   */
  global String title;

  global Object clone() {}

}