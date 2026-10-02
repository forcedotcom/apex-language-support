global class MergeRequest {
    global List additionalinformationmap { get; set; }
    global SObject masterrecord { get; set; }
    global List recordtomergeids { get; set; }

    Object MergeRequest() { return null; }

    global Boolean equals(Object obj) { return false; }

    global List getAdditionalInformationMap() { return null; }

    global SObject getMasterRecord() { return null; }

    global List getRecordToMergeIds() { return null; }

    global Integer hashCode() { return 0; }

    global void setAdditionalInformationMap(List param1) { }

    global void setMasterRecord(SObject param1) { }

    global void setRecordToMergeIds(List param1) { }

    global String toString() { return null; }
}