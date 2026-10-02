global virtual class WorkCapacityCalculation {
    global Object WorkCapacityCalculation() { return null; }

    global virtual Support.WorkCapacityDuration calculateActualUsage(Support.WorkCapacityInfo inputWorkCapacity) { return null; }

    global virtual Support.WorkCapacityDuration calculateEstimatedUsage(Support.WorkCapacityInfo inputWorkCapacity) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}