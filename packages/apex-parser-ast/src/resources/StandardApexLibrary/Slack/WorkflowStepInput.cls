global class WorkflowStepInput {
    global Object WorkflowStepInput() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Boolean getSkipVariableReplacement() { return false; }

    global Object getValue() { return null; }

    global Map getVariables() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setSkipVariableReplacement(Boolean skipVariableReplacement) { }

    global void setValue(Object value) { }

    global void setVariables(Map variables) { }

    global override String toString() { return null; }
}