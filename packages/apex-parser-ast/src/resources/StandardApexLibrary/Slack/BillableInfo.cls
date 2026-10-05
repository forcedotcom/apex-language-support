global class BillableInfo {
    global BillableInfo() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isBillingActive() { return false; }

    global void setBillingActive(Boolean billingActive) { }

    global override String toString() { return null; }
}