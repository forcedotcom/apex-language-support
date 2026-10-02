/**
 * The return type of the FormulaRecalcResult.getErrors method.
 */
global class FormulaRecalcFieldError {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a message describing the errors encountered during formula recalculation.
     */
    global String getFieldError() { return null; }

    /**
     * Returns the name of the formula recalculation error field.
     */
    global String getFieldName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}