global class ActionInvoker {
    global ActionInvoker() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    @AuraEnabled
    global static Invocable.ActionInvoker.Result invokeCustomAction(String type, String namespace, String name, Map parameters, Double apiVersion) { return null; }

    global override virtual String toString() { return null; }

    global class Error {
        @AuraEnabled
        global String code { get; set; }
        @AuraEnabled
        global String message { get; set; }

        global Error() { }

        global Invocable.ActionInvoker.Error clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    global class Result {
        @AuraEnabled
        global List errors { get; set; }
        @AuraEnabled
        global Boolean isSuccess { get; set; }
        @AuraEnabled
        global Map outputParameters { get; set; }

        global Result() { }

        global Invocable.ActionInvoker.Result clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}