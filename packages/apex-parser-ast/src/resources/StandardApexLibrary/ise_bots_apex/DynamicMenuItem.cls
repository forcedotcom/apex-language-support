/**
 * Contains properties to define and hold the details for a single dynamic menu item Each item contains information related to an object, such as identifiers, labels, summaries, and sorting logic. It enables bots to present context-aware and user-relevant choices dynamically during conversations. .
 */
global class DynamicMenuItem {

  global DynamicMenuItem() {}

  public String EntityId;

  public String EntityIdValue;

  public String EntityName;

  public String EntityNameValue;

  public String Label;

  public String LabelValue;

  public String SummaryTextWithFormula;

  public String SummaryTextWithFormulaValue;

  public Date sortByDate;

  public Date sortByDateValue;

  global Object clone() {}

}