global class ConsentRequestInput {
    @AuraEnabled
    global List recordList { get; set; }

    global ConsentRequestInput() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}