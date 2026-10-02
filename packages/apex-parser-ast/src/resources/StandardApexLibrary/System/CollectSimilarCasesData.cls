global class CollectSimilarCasesData implements Database.Batchable {
    global Object CollectSimilarCasesData(Integer nCases, Integer similarCutoffNumber, Boolean isStrategyTest) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global void execute(Database.BatchableContext BC, List caseList) { }

    global void finish(Database.BatchableContext BC) { }

    global virtual Integer hashCode() { return 0; }

    global Database.QueryLocator start(Database.BatchableContext BC) { return null; }

    global override virtual String toString() { return null; }
}