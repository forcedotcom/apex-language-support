/**
 * Contains methods and constructors for working with information about a custom summary formula (CSF).
 */
global class ReportCsf {

  public ReportCsf(String label, String description, Reports.FormulaType formulaType, Integer decimalPlaces, String downGroup, Reports.CsfGroupType downGroupType, String acrossGroup, Reports.CsfGroupType acrossGroupType, String formula) {}

  /**
   * Returns the name of a column grouping when the acrossGroupType is CUSTOM . Otherwise, returns null .
   * @return String
   */
  public String getAcrossGroup() {}

  /**
   * Returns where to display the aggregate.
   * @return Reports.CsfGroupType
   */
  public Reports.CsfGroupType getAcrossGroupType() {}

  /**
   * Returns the number of decimal places that numbers in the custom summary formula have.
   * @return Integer
   */
  public Integer getDecimalPlaces() {}

  /**
   * Returns the user-facing description of a custom summary formula.
   * @return String
   */
  public String getDescription() {}

  /**
   * Returns the name of a row grouping when the downGroupType is CUSTOM . Otherwise, returns null .
   * @return String
   */
  public String getDownGroup() {}

  /**
   * Returns where to display the aggregate of the custom summary formula.
   * @return Reports.CsfGroupType
   */
  public Reports.CsfGroupType getDownGroupType() {}

  /**
   * Returns the operations performed on values in the custom summary formula.
   * @return String
   */
  public String getFormula() {}

  /**
   * Returns the formula type.
   * @return Reports.FormulaType
   */
  public Reports.FormulaType getFormulaType() {}

  /**
   * Returns the user-facing name of the custom summary formula.
   * @return String
   */
  public String getLabel() {}

  /**
   * Specifies the column for the across grouping.
   * @param acrossGroup 
   */
  public void setAcrossGroup(String acrossGroup) {}

  /**
   * Sets where to display the aggregate.
   * @param value For possible values, see Reports.CsfGroupType .
   */
  public void setAcrossGroupType(String value) {}

  /**
   * Sets where to display the aggregate.
   * @param acrossGroupType 
   */
  public void setAcrossGroupType(Reports.CsfGroupType acrossGroupType) {}

  /**
   * Sets the number of decimal places in numbers.
   * @param decimalPlaces 
   */
  public void setDecimalPlaces(Integer decimalPlaces) {}

  /**
   * Sets the user-facing description of the custom summary formula.
   * @param description 
   */
  public void setDescription(String description) {}

  /**
   * Sets the name of a row grouping when the downGroupType is CUSTOM .
   * @param downGroup 
   */
  public void setDownGroup(String downGroup) {}

  /**
   * Sets where to display the aggregate.
   * @param value For valid values, see Reports.CsfGroupType .
   */
  public void setDownGroupType(String value) {}

  /**
   * Sets where to display the aggregate.
   * @param downGroupType 
   */
  public void setDownGroupType(Reports.CsfGroupType downGroupType) {}

  /**
   * Sets the operations to perform on values in the custom summary formula.
   * @param formula 
   */
  public void setFormula(String formula) {}

  /**
   * Sets the format of the numbers in the custom summary formula.
   * @param value For valid values, see Reports.FormulaType .
   */
  public void setFormulaType(String value) {}

  /**
   * Sets the format of the numbers in the custom summary formula.
   * @param formulaType 
   */
  public void setFormulaType(Reports.FormulaType formulaType) {}

  /**
   * Sets the user-facing name of the custom summary formula.
   * @param label 
   */
  public void setLabel(String label) {}

  /**
   * Returns a string.
   * @return String
   */
  public String toString() {}

}