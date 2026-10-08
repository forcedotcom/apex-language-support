global class WorkflowStepOutput {
    global WorkflowStepOutput() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getLabel() { return null; }

    global String getName() { return null; }

    global String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setLabel(String label) { }

    global void setName(String name) { }

    global void setType(String type) { }

    global override String toString() { return null; }
}