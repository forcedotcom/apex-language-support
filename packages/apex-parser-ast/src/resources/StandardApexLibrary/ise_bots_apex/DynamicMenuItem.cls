/**
 * Contains properties to define and hold the details for a single dynamic menu item Each item contains information related to an object, such as identifiers, labels, summaries, and sorting logic. It enables bots to present context-aware and user-relevant choices dynamically during conversations. .
 */
global class DynamicMenuItem {

  global String EntityId;

  global String EntityIdValue;

  global String EntityName;

  global String EntityNameValue;

  global String Label;

  global String LabelValue;

  global String SummaryTextWithFormula;

  global String SummaryTextWithFormulaValue;

  global Date sortByDate;

  global Date sortByDateValue;

}