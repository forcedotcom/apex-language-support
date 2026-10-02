/**
 * Contains methods and constructors for working with information about a custom summary formula (CSF).
 */
global class ReportCsf {
    /**
     * Creates an instance of the Reports.ReportCsf class. You can then set values by using the class’s set methods.
     */
    global Object ReportCsf() { return null; }

    /**
     * Creates an instance of the Reports.ReportCsf class using the specified parameters.
     */
    global Object ReportCsf(String label, String description, reports.FormulaType formulaType, Integer decimalPlaces, String downGroup, reports.CsfGroupType downGroupType, String acrossGroup, reports.CsfGroupType acrossGroupType, String formula) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the name of a column grouping when the acrossGroupType is CUSTOM. Otherwise, returns null.
     */
    global String getAcrossGroup() { return null; }

    /**
     * Returns where to display the aggregate.
     */
    global reports.CsfGroupType getAcrossGroupType() { return null; }

    /**
     * Returns the number of decimal places that numbers in the custom summary formula have.
     */
    global Integer getDecimalPlaces() { return 0; }

    /**
     * Returns the user-facing description of a custom summary formula.
     */
    global String getDescription() { return null; }

    /**
     * Returns the name of a row grouping when the downGroupType is CUSTOM. Otherwise, returns null.
     */
    global String getDownGroup() { return null; }

    /**
     * Returns where to display the aggregate of the custom summary formula.
     */
    global reports.CsfGroupType getDownGroupType() { return null; }

    /**
     * Returns the operations performed on values in the custom summary formula.
     */
    global String getFormula() { return null; }

    /**
     * Returns the formula type.
     */
    global reports.FormulaType getFormulaType() { return null; }

    /**
     * Returns the user-facing name of the custom summary formula.
     */
    global String getLabel() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Specifies the column for the across grouping.
     */
    global void setAcrossGroup(String acrossGroup) { }

    /**
     * Sets where to display the aggregate.
     */
    global void setAcrossGroupType(reports.CsfGroupType acrossGroupType) { }

    /**
     * Sets where to display the aggregate.
     */
    global void setAcrossGroupType(String value) { }

    /**
     * Sets the number of decimal places in numbers.
     */
    global void setDecimalPlaces(Integer decimalPlaces) { }

    /**
     * Sets the user-facing description of the custom summary formula.
     */
    global void setDescription(String description) { }

    /**
     * Sets the name of a row grouping when the downGroupType is CUSTOM.
     */
    global void setDownGroup(String downGroup) { }

    /**
     * Sets where to display the aggregate.
     */
    global void setDownGroupType(reports.CsfGroupType downGroupType) { }

    /**
     * Sets where to display the aggregate.
     */
    global void setDownGroupType(String value) { }

    /**
     * Sets the operations to perform on values in the custom summary formula.
     */
    global void setFormula(String formula) { }

    /**
     * Sets the format of numbers used in the custom summary formula.
     */
    global void setFormulaType(reports.FormulaType formulaType) { }

    /**
     * Sets the format of the numbers in the custom summary formula.
     */
    global void setFormulaType(String value) { }

    /**
     * Sets the user-facing name of the custom summary formula.
     */
    global void setLabel(String label) { }

    /**
     * Returns a string.
     */
    global override virtual String toString() { return null; }
}